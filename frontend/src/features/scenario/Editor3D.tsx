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
}

export function Editor3D({
  turbines,
  selectedIds,
  onMove,
  onAdd,
  onSelect,
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
    controls.dampingFactor = 0.1;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 1000;
    controls.maxDistance = 100000;
    controls.panSpeed = 1.5;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.2;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.PAN,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };

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

    const geometry = new THREE.CylinderGeometry(40, 50, 120, 16);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xeeeeee,
      metalness: 0.3,
      roughness: 0.6,
      flatShading: false,
    });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, 20000);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    scene.add(instancedMesh);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    const previewGeometry = new THREE.CylinderGeometry(40, 50, 120, 16);
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

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      geometry.dispose();
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

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!sceneRef.current) return;
    if (e.button !== 0) return; // Solo botón izquierdo
    
    const { raycaster, mouse, camera, instancedMesh, turbineMap, controls } =
      sceneRef.current;

    const rect = containerRef.current!.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(instancedMesh);

    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
      const instanceId = intersects[0].instanceId;
      const turbineId = turbineMap.get(instanceId);
      if (turbineId) {
        e.stopPropagation();
        controls.enabled = false; // Deshabilitar OrbitControls durante drag
        sceneRef.current.selectedIndex = instanceId;
        sceneRef.current.isDragging = true;

        if (e.shiftKey) {
          const newSelected = new Set(selectedIds);
          if (newSelected.has(turbineId)) {
            newSelected.delete(turbineId);
          } else {
            newSelected.add(turbineId);
          }
          onSelect(newSelected);
        } else {
          onSelect(new Set([turbineId]));
        }
      }
    } else {
      onSelect(new Set());
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!sceneRef.current) return;

    const { raycaster, mouse, camera, dragPlane, turbineMap, previewMarker, isDragging, selectedIndex, instancedMesh } = sceneRef.current;
    const rect = containerRef.current!.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, point);

    if (isDragging && selectedIndex !== null && point) {
      const turbineId = turbineMap.get(selectedIndex);
      if (turbineId) {
        const turbine = turbines.find((t) => t.id === turbineId);
        if (turbine) {
          // Actualizar visualmente en tiempo real
          const matrix = new THREE.Matrix4();
          matrix.setPosition(point.x, turbine.hubHeight / 2, point.z);
          instancedMesh.setMatrixAt(selectedIndex, matrix);
          instancedMesh.instanceMatrix.needsUpdate = true;
          
          turbine.x = point.x;
          turbine.y = point.z;
        }
      }
    } else if (!isDragging && point) {
      previewMarker.position.set(point.x, 60, point.z);
      previewMarker.visible = true;
    }
  };

  const handlePointerUp = () => {
    if (!sceneRef.current) return;
    
    const { controls, isDragging, selectedIndex, turbineMap } = sceneRef.current;
    
    controls.enabled = true; // Re-habilitar OrbitControls
    
    if (!isDragging || selectedIndex === null) return;

    const turbineId = turbineMap.get(selectedIndex);
    if (turbineId) {
      const turbine = turbines.find((t) => t.id === turbineId);
      if (turbine) {
        onMove(turbineId, Math.round(turbine.x), Math.round(turbine.y));
      }
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

  const cursorStyle = sceneRef.current?.isDragging ? 'grabbing' : 'grab';

  return (
    <div
      ref={containerRef}
      style={{ 
        width: '100%', 
        height: '100%', 
        cursor: cursorStyle,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    />
  );
}
