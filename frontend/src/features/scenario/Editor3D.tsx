import { useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Turbine } from '@/types';

interface Editor3DProps {
  turbines: Turbine[];
  selectedIds: Set<string>;
  onMove: (id: string, x: number, y: number) => void;
  onAdd: (x: number, y: number) => void;
  onSelect: (ids: Set<string>) => void;
  onDelete: (id: string) => void;
}

export function Editor3D({
  turbines,
  selectedIds,
  onMove,
  onAdd,
  onSelect,
  onDelete,
}: Editor3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    instancedMesh: THREE.InstancedMesh;
    turbineMap: Map<number, string>;
    selectedIndex: number | null;
    raycaster: THREE.Raycaster;
    mouse: THREE.Vector2;
    dragPlane: THREE.Plane;
    isDragging: boolean;
    previewMarker: THREE.Mesh;
    dragPlaneMesh: THREE.Mesh;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      1,
      500000
    );
    camera.position.set(20000, 15000, 20000);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(
      containerRef.current.clientWidth,
      containerRef.current.clientHeight
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 500;
    controls.maxDistance = 150000;
    controls.panSpeed = 2.0;
    controls.rotateSpeed = 1.0;
    controls.zoomSpeed = 1.5;
    controls.screenSpacePanning = true;
    // Solo botón derecho y medio controlan la cámara
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.enablePan = false; // Deshabilitamos pan, solo rotar y zoom

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1000, 2000, 500);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(100000, 100, 0x444444, 0x222222);
    scene.add(gridHelper);

    const dragPlaneGeometry = new THREE.PlaneGeometry(200000, 200000);
    const dragPlaneMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      transparent: true, 
      opacity: 0,
      side: THREE.DoubleSide,
    });
    const dragPlaneMesh = new THREE.Mesh(dragPlaneGeometry, dragPlaneMaterial);
    dragPlaneMesh.rotation.x = -Math.PI / 2;
    dragPlaneMesh.visible = false;
    scene.add(dragPlaneMesh);

    // Geometría simple de cilindro para turbina
    const geometry = new THREE.CylinderGeometry(20, 30, 100, 12);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xe0e0e0,
      metalness: 0.3,
      roughness: 0.6,
    });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, 20000);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    scene.add(instancedMesh);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Preview marker (cilindro verde)
    const previewGeometry = new THREE.CylinderGeometry(20, 30, 100, 12);
    const previewMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5,
      emissive: 0x00ff00,
      emissiveIntensity: 0.3,
    });
    const previewMarker = new THREE.Mesh(previewGeometry, previewMaterial);
    previewMarker.visible = false;
    scene.add(previewMarker);

    sceneRef.current = {
      scene,
      camera,
      renderer,
      controls,
      instancedMesh,
      turbineMap: new Map(),
      selectedIndex: null,
      raycaster,
      mouse,
      dragPlane,
      isDragging: false,
      previewMarker,
      dragPlaneMesh,
    };

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !sceneRef.current) return;
      const { camera, renderer } = sceneRef.current;
      camera.aspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight
      );
    };
    window.addEventListener('resize', handleResize);

    // Keyboard navigation
    const keys = { w: false, a: false, s: false, d: false, ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
    const keyboardSpeed = 500;

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key as keyof typeof keys;
      if (key in keys) {
        keys[key] = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key as keyof typeof keys;
      if (key in keys) {
        keys[key] = false;
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Update camera position based on keyboard input
    const updateCameraPosition = () => {
      const forward = new THREE.Vector3();
      const right = new THREE.Vector3();
      
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      
      right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
      
      const movement = new THREE.Vector3();
      
      if (keys.w || keys.ArrowUp) movement.add(forward);
      if (keys.s || keys.ArrowDown) movement.sub(forward);
      if (keys.a || keys.ArrowLeft) movement.sub(right);
      if (keys.d || keys.ArrowRight) movement.add(right);
      
      if (movement.length() > 0) {
        movement.normalize().multiplyScalar(keyboardSpeed);
        camera.position.add(movement);
        controls.target.add(movement);
      }
      
      requestAnimationFrame(updateCameraPosition);
    };
    updateCameraPosition();

    // Store container ref for cleanup
    const containerElement = containerRef.current;

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (containerElement) {
        containerElement.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (!sceneRef.current) return;

    const { instancedMesh, turbineMap } = sceneRef.current;
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    turbineMap.clear();

    turbines.forEach((turbine, index) => {
      turbineMap.set(index, turbine.id);

      matrix.identity();
      matrix.setPosition(turbine.x, 50, turbine.y); // Y=50 para centrar cilindro de 100 unidades
      instancedMesh.setMatrixAt(index, matrix);

      if (selectedIds.has(turbine.id)) {
        color.setHex(0xffaa00);
      } else {
        color.setHex(0xeeeeee);
      }
      instancedMesh.setColorAt(index, color);
    });

    instancedMesh.count = turbines.length;
    instancedMesh.instanceMatrix.needsUpdate = true;
    if (instancedMesh.instanceColor) {
      instancedMesh.instanceColor.needsUpdate = true;
    }
  }, [turbines, selectedIds]);

  // Handle Delete key for selected turbines
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.size > 0) {
        e.preventDefault();
        // Eliminar todas las turbinas seleccionadas
        selectedIds.forEach((id) => {
          onDelete(id);
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, onDelete]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!sceneRef.current) return;
    if (e.button !== 0) return; // Solo botón izquierdo
    
    const { raycaster, mouse, camera, dragPlane, controls } = sceneRef.current;

    const rect = containerRef.current!.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    // Encontrar punto en el plano de arrastre
    raycaster.setFromCamera(mouse, camera);
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, point);

    if (!point) {
      onSelect(new Set());
      return;
    }

    // Buscar turbina más cercana al punto del click (en 2D)
    type ClosestTurbine = { id: string; index: number; distance: number };
    let closestTurbine: ClosestTurbine | null = null;
    const maxClickDistance = 300; // Distancia máxima para considerar un click

    turbines.forEach((turbine, index) => {
      const dx = turbine.x - point.x;
      const dy = turbine.y - point.z;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < maxClickDistance && (!closestTurbine || distance < closestTurbine.distance)) {
        closestTurbine = { id: turbine.id, index, distance };
      }
    });

    if (closestTurbine) {
      const selectedTurbine: ClosestTurbine = closestTurbine;
      e.stopPropagation();
      controls.enabled = false; // Deshabilitar OrbitControls durante drag
      sceneRef.current.selectedIndex = selectedTurbine.index;
      sceneRef.current.isDragging = true;

      if (e.shiftKey) {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(selectedTurbine.id)) {
          newSelected.delete(selectedTurbine.id);
        } else {
          newSelected.add(selectedTurbine.id);
        }
        onSelect(newSelected);
      } else {
        onSelect(new Set([selectedTurbine.id]));
      }
    } else {
      onSelect(new Set());
    }
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!sceneRef.current || !containerRef.current) return;

    const { raycaster, mouse, camera, dragPlane, previewMarker, isDragging, selectedIndex, instancedMesh } = sceneRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, point);

    if (!point) return;

    if (isDragging && selectedIndex !== null) {
      const turbine = turbines[selectedIndex];
      if (turbine) {
        // Actualizar visualmente en tiempo real
        const matrix = new THREE.Matrix4();
        matrix.setPosition(point.x, 50, point.z);
        instancedMesh.setMatrixAt(selectedIndex, matrix);
        instancedMesh.instanceMatrix.needsUpdate = true;
        
        turbine.x = point.x;
        turbine.y = point.z;
      }
    } else if (!isDragging) {
      // Buscar turbina bajo el cursor
      let closestTurbine: { index: number; distance: number } | null = null;
      const hoverDistance = 200;

      turbines.forEach((turbine, index) => {
        const dx = turbine.x - point.x;
        const dy = turbine.y - point.z;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < hoverDistance && (!closestTurbine || distance < closestTurbine.distance)) {
          closestTurbine = { index, distance };
        }
      });

      // Cambiar cursor si hay turbina bajo el ratón
      if (closestTurbine && containerRef.current) {
        containerRef.current.style.cursor = 'pointer';
      } else if (containerRef.current) {
        containerRef.current.style.cursor = 'default';
      }

      previewMarker.position.set(point.x, 50, point.z);
      previewMarker.visible = true;
    }
  }, [turbines]);

  const handlePointerUp = () => {
    if (!sceneRef.current) return;
    
    const { controls, isDragging, selectedIndex } = sceneRef.current;
    
    controls.enabled = true; // Re-habilitar OrbitControls
    
    if (!isDragging || selectedIndex === null) return;

    const turbine = turbines[selectedIndex];
    if (turbine) {
      onMove(turbine.id, Math.round(turbine.x), Math.round(turbine.y));
    }

    sceneRef.current.isDragging = false;
    sceneRef.current.selectedIndex = null;
  };

  const handleDoubleClick = (_e: React.MouseEvent) => {
    if (!sceneRef.current) return;
    const { previewMarker } = sceneRef.current;

    if (previewMarker.visible) {
      onAdd(
        Math.round(previewMarker.position.x),
        Math.round(previewMarker.position.z)
      );
      previewMarker.visible = false;
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    />
  );
}
