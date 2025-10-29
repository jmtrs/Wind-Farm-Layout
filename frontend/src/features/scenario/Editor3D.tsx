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
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(1000, 2000, 500);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(100000, 100, 0x444444, 0x222222);
    scene.add(gridHelper);

    const geometry = new THREE.CylinderGeometry(60, 60, 100, 8);
    const material = new THREE.MeshStandardMaterial({ color: 0x4a9eff });
    const instancedMesh = new THREE.InstancedMesh(geometry, material, 20000);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

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
        color.setHex(0xff9944);
      } else {
        color.setHex(0x4a9eff);
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
    const { raycaster, mouse, camera, instancedMesh, turbineMap } =
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
    if (!sceneRef.current || !sceneRef.current.isDragging) return;
    if (sceneRef.current.selectedIndex === null) return;

    const { raycaster, mouse, camera, dragPlane, turbineMap } =
      sceneRef.current;
    const rect = containerRef.current!.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(dragPlane, point);

    const turbineId = turbineMap.get(sceneRef.current.selectedIndex);
    if (turbineId) {
      const turbine = turbines.find((t) => t.id === turbineId);
      if (turbine) {
        turbine.x = point.x;
        turbine.y = point.z;
      }
    }
  };

  const handlePointerUp = () => {
    if (!sceneRef.current || !sceneRef.current.isDragging) return;
    if (sceneRef.current.selectedIndex === null) return;

    const { turbineMap } = sceneRef.current;
    const turbineId = turbineMap.get(sceneRef.current.selectedIndex);
    if (turbineId) {
      const turbine = turbines.find((t) => t.id === turbineId);
      if (turbine) {
        onMove(turbineId, Math.round(turbine.x), Math.round(turbine.y));
      }
    }

    sceneRef.current.isDragging = false;
    sceneRef.current.selectedIndex = null;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!sceneRef.current) return;
    const { raycaster, mouse, camera } = sceneRef.current;

    const rect = containerRef.current!.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, point);

    onAdd(Math.round(point.x), Math.round(point.z));
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', cursor: 'crosshair' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    />
  );
}
