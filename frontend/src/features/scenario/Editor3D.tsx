import { useRef, useEffect } from 'react';
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

    // Turbina simple pero realista: torre + cruz en la parte superior
    const turbineGeometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    
    // Torre cónica (cilindro)
    const towerHeight = 80;
    const towerRadiusBottom = 25;
    const towerRadiusTop = 20;
    const towerSegments = 8;
    
    for (let i = 0; i < towerSegments; i++) {
      const angle1 = (i / towerSegments) * Math.PI * 2;
      const angle2 = ((i + 1) / towerSegments) * Math.PI * 2;
      
      const x1Bottom = Math.cos(angle1) * towerRadiusBottom;
      const z1Bottom = Math.sin(angle1) * towerRadiusBottom;
      const x2Bottom = Math.cos(angle2) * towerRadiusBottom;
      const z2Bottom = Math.sin(angle2) * towerRadiusBottom;
      
      const x1Top = Math.cos(angle1) * towerRadiusTop;
      const z1Top = Math.sin(angle1) * towerRadiusTop;
      const x2Top = Math.cos(angle2) * towerRadiusTop;
      const z2Top = Math.sin(angle2) * towerRadiusTop;
      
      // Triángulo 1
      positions.push(x1Bottom, 0, z1Bottom);
      positions.push(x1Top, towerHeight, z1Top);
      positions.push(x2Bottom, 0, z2Bottom);
      
      // Triángulo 2
      positions.push(x2Bottom, 0, z2Bottom);
      positions.push(x1Top, towerHeight, z1Top);
      positions.push(x2Top, towerHeight, z2Top);
      
      // Normales (simplificadas)
      for (let j = 0; j < 6; j++) {
        const nx = Math.cos((angle1 + angle2) / 2);
        const nz = Math.sin((angle1 + angle2) / 2);
        normals.push(nx, 0, nz);
      }
    }
    
    // Añadir 3 aspas en la parte superior como líneas/barras 3D
    const bladeLength = 40;
    const bladeWidth = 4;
    const hubY = towerHeight;
    
    // 3 aspas rotadas 120 grados en el plano Y
    for (let blade = 0; blade < 3; blade++) {
      const angleY = (blade * 120) * Math.PI / 180;
      
      // Crear aspa como una caja delgada que sale radialmente desde el centro
      // El aspa va desde el centro hacia afuera
      for (let i = 0; i < 2; i++) {
        const r1 = i === 0 ? 0 : bladeLength;
        const r2 = i === 0 ? bladeLength : bladeLength;
        
        const x1 = Math.sin(angleY) * r1;
        const z1 = Math.cos(angleY) * r1;
        const x2 = Math.sin(angleY) * r2;
        const z2 = Math.cos(angleY) * r2;
        
        // Crear rectángulo del aspa (dos caras)
        const hw = bladeWidth / 2;
        
        // Cara frontal
        positions.push(
          x1, hubY - hw, z1,
          x2, hubY - hw, z2,
          x1, hubY + hw, z1
        );
        positions.push(
          x1, hubY + hw, z1,
          x2, hubY - hw, z2,
          x2, hubY + hw, z2
        );
        
        // Normales perpendiculares al aspa
        const nx = Math.cos(angleY);
        const nz = -Math.sin(angleY);
        for (let j = 0; j < 6; j++) {
          normals.push(nx, 0, nz);
        }
      }
    }
    
    turbineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    turbineGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    turbineGeometry.computeBoundingSphere();
    
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xdddddd,
      metalness: 0.3,
      roughness: 0.7,
      side: THREE.DoubleSide,
    });
    
    const instancedMesh = new THREE.InstancedMesh(turbineGeometry, material, 20000);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    scene.add(instancedMesh);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    // Preview marker verde
    const previewGeometry = turbineGeometry.clone();
    const previewMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.6,
      emissive: 0x00ff00,
      emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
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

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      renderer.dispose();
      turbineGeometry.dispose();
      material.dispose();
      containerRef.current?.removeChild(renderer.domElement);
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
      matrix.setPosition(turbine.x, turbine.hubHeight / 2, turbine.y);
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

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!sceneRef.current) return;

    const { raycaster, mouse, camera, dragPlane, previewMarker, isDragging, selectedIndex, instancedMesh } = sceneRef.current;
    const rect = containerRef.current!.getBoundingClientRect();
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
        matrix.setPosition(point.x, turbine.hubHeight / 2, point.z);
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

      previewMarker.position.set(point.x, 0, point.z);
      previewMarker.visible = true;
    }
  };

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
