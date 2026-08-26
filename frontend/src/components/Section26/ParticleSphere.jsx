import React, { useEffect, useRef, useMemo } from "react";
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  Color,
  SphereGeometry,
  MeshBasicMaterial,
  InstancedMesh,
  Mesh,
  Matrix4,
  Group,
  Vector3,
  AdditiveBlending,
  Float32BufferAttribute,
} from "three";

function mapLinear(value, inMin, inMax, outMin, outMax) {
  if (inMax === inMin) return outMin;
  const t = (value - inMin) / (inMax - inMin);
  return outMin + t * (outMax - outMin);
}

const CURSOR_PHYSICS = {
  RETURN_FORCE: 0.015,
  FRICTION: 0.94,
};

export default function ParticleSphere({
  particlesCount = 10000,
  speed = 20,
  smoothing = 7,
  scale = 10,
  stopOnHover = false,
  rotationDirection = "clockwise",
  dragSpeed = 5,
  drag = true,
  particleScale = 7,
  cursorOn = true,
  cursorRadiusUI = 75,
  cursorStrengthUI = 10,
  clickForce = 5,
  sphereColor = "#FF3B00",
  coreColor,
  coreScale = 0.97,
  style,
}) {
  const speedN = speed / 10;
  const smoothingN = smoothing / 10;
  const scaleN = scale / 10;
  const dragN = dragSpeed / 10;
  const sizeN = particleScale / 10;
  const strengthN = cursorStrengthUI / 10;

  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const particlesRef = useRef(null);
  const particlesGroupRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mouseRef = useRef(null);
  const baseParticlePositionsRef = useRef([]);
  const particleDisplacementsRef = useRef([]);
  const particleScatterVelocitiesRef = useRef([]);

  const rotationSpeed = useMemo(() => {
    const baseSpeed = mapLinear(speedN, 0.1, 1.0, 0.01, 0.05);
    return rotationDirection === "anticlockwise" ? -baseSpeed : baseSpeed;
  }, [speedN, rotationDirection]);

  const scaleMultiplier = useMemo(() => {
    const clamped = Math.max(0, Math.min(1, scaleN));
    return mapLinear(clamped, 0, 1.0, 0.25, 1.25);
  }, [scaleN]);

  const particleSize = useMemo(() => {
    const clamped = Math.max(0.1, Math.min(1, sizeN));
    return mapLinear(clamped, 0.1, 1.0, 0.01, 0.1);
  }, [sizeN]);

  const cursorRadius = useMemo(
    () => Math.max(0, Math.min(600, cursorRadiusUI)),
    [cursorRadiusUI]
  );

  const cursorStrength = useMemo(() => {
    const clamped = Math.max(0, Math.min(1, strengthN));
    return mapLinear(clamped, 0, 1.0, 0, 15);
  }, [strengthN]);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const containerWidth = 340;
    const containerHeight = 311;

    const canvasOverflowMultiplier = 2.5;
    const canvasWidth = containerWidth * canvasOverflowMultiplier;
    const canvasHeight = containerHeight * canvasOverflowMultiplier;

    const scene = new Scene();
    sceneRef.current = scene;

    const baseFOV = 50;
    const adjustedFOV =
      2 *
      Math.atan(
        Math.tan((baseFOV * Math.PI) / 180 / 2) * canvasOverflowMultiplier
      ) *
      (180 / Math.PI);

    const camera = new PerspectiveCamera(
      adjustedFOV,
      canvasWidth / canvasHeight,
      0.1,
      1000
    );

    const baseCameraDistance = 3.0;
    const currentSphereRadius = 1.0 * scaleMultiplier;
    const cameraDistance = Math.max(baseCameraDistance, currentSphereRadius + 1.0);
    camera.position.z = cameraDistance;
    cameraRef.current = camera;

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(canvasWidth, canvasHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = "srgb";
    const canvas = renderer.domElement;
    canvas.style.position = "absolute";
    const offsetX = (canvasWidth - containerWidth) / 2;
    const offsetY = (canvasHeight - containerHeight) / 2;
    canvas.style.left = `-${offsetX}px`;
    canvas.style.top = `-${offsetY}px`;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    canvas.style.display = "block";
    container.appendChild(canvas);
    rendererRef.current = renderer;

    const baseColorObj = new Color(sphereColor);
    const particleOpacity = 1;

    const vertices = [];
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const baseSphereRadius = 1.0;
    const sphereRadius = baseSphereRadius * scaleMultiplier;

    baseParticlePositionsRef.current = [];
    particleDisplacementsRef.current = [];
    particleScatterVelocitiesRef.current = [];

    for (let i = 0; i < particlesCount; i++) {
      const y = 1 - (i / (particlesCount - 1)) * 2;
      const radius = Math.sqrt(1 - y * y);
      const theta = goldenAngle * i;

      const x = Math.cos(theta) * radius;
      const z = Math.sin(theta) * radius;

      const posX = x * sphereRadius;
      const posY = y * sphereRadius;
      const posZ = z * sphereRadius;
      vertices.push(posX, posY, posZ);

      baseParticlePositionsRef.current.push(new Vector3(posX, posY, posZ));
      particleDisplacementsRef.current.push(new Vector3(0, 0, 0));
      particleScatterVelocitiesRef.current.push(new Vector3(0, 0, 0));
    }

    const sphereGeomRadius = particleSize * 0.15;
    const sphereGeometry = new SphereGeometry(sphereGeomRadius, 8, 8);
    const sphereMaterial = new MeshBasicMaterial({
      color: 0xffffff,
      blending: AdditiveBlending,
      transparent: true,
      opacity: particleOpacity,
    });

    const particles = new InstancedMesh(
      sphereGeometry,
      sphereMaterial,
      particlesCount
    );

    const matrix = new Matrix4();
    for (let i = 0; i < particlesCount; i++) {
      const idx = i * 3;
      matrix.setPosition(vertices[idx], vertices[idx + 1], vertices[idx + 2]);
      particles.setMatrixAt(i, matrix);
    }
    particles.instanceMatrix.needsUpdate = true;

    const instanceColors = new Float32Array(particlesCount * 3);
    for (let i = 0; i < particlesCount; i++) {
      const idx = i * 3;
      instanceColors[idx] = baseColorObj.r;
      instanceColors[idx + 1] = baseColorObj.g;
      instanceColors[idx + 2] = baseColorObj.b;
    }
    particles.instanceColor = new Float32BufferAttribute(instanceColors, 3);
    particles.instanceColor.needsUpdate = true;
    particlesRef.current = particles;

    const particlesGroup = new Group();
    particlesGroupRef.current = particlesGroup;

    if (coreColor) {
      const coreGeometry = new SphereGeometry(sphereRadius * coreScale, 64, 48);
      const coreMaterial = new MeshBasicMaterial({
        color: new Color(coreColor),
      });
      const coreMesh = new Mesh(coreGeometry, coreMaterial);
      particlesGroup.add(coreMesh);
    }

    particlesGroup.add(particles);
    scene.add(particlesGroup);

    const rotation = { x: 0, y: 0 };
    const targetRotation = { x: 0, y: 0 };
    const velocity = { x: 0, y: 0 };
    let isDragging = false;
    let isHovering = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastDragTime = 0;
    let animationFrameId = null;

    let lastFrameTime = performance.now();
    const targetDeltaTime = 1000 / 60;

    const lerpFactor =
      smoothingN === 0 ? 1 : mapLinear(smoothingN, 0, 1, 0.4, 0.03);
    const velocityDecay = mapLinear(smoothingN, 0, 1, 0.7, 0.96);

    const animateCore = () => {
      const now = performance.now();
      const deltaTime = now - lastFrameTime;
      lastFrameTime = now;
      const deltaFactor = deltaTime / targetDeltaTime;

      const threshold = 0.01;

      if (!isDragging && rotationSpeed !== 0 && (!stopOnHover || !isHovering)) {
        targetRotation.x += rotationSpeed * 0.1 * deltaFactor;
      }

      if (!isDragging && smoothingN > 0) {
        if (
          Math.abs(velocity.x) > threshold ||
          Math.abs(velocity.y) > threshold
        ) {
          targetRotation.x += velocity.x * deltaFactor;
          targetRotation.y += velocity.y * deltaFactor;
          targetRotation.y = Math.max(
            -Math.PI / 2,
            Math.min(Math.PI / 2, targetRotation.y)
          );
          const decayFactor = Math.pow(velocityDecay, deltaFactor);
          velocity.x *= decayFactor;
          velocity.y *= decayFactor;
        } else {
          velocity.x = 0;
          velocity.y = 0;
        }
      }

      const dx = targetRotation.x - rotation.x;
      const dy = targetRotation.y - rotation.y;

      if (
        Math.abs(dx) > threshold ||
        Math.abs(dy) > threshold ||
        rotationSpeed !== 0 ||
        isDragging
      ) {
        const timeLerpFactor = 1 - Math.pow(1 - lerpFactor, deltaFactor);
        rotation.x += dx * timeLerpFactor;
        rotation.y += dy * timeLerpFactor;
        rotation.y = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, rotation.y));
      }

      particlesGroup.rotation.y = rotation.x;
      particlesGroup.rotation.x = rotation.y;
      particlesGroup.updateMatrixWorld(true);

      const currentCanvasWidth = canvasWidth;
      const currentCanvasHeight = canvasHeight;
      const currentCamera = cameraRef.current;
      const cursorRadiusSquared = cursorRadius * cursorRadius;

      if (cursorOn && baseParticlePositionsRef.current.length > 0) {
        for (let i = 0; i < baseParticlePositionsRef.current.length; i++) {
          const basePos = baseParticlePositionsRef.current[i];
          const displacement = particleDisplacementsRef.current[i];

          if (mouseRef.current) {
            const mouse = mouseRef.current;

            const currentLocalPos = new Vector3();
            currentLocalPos.copy(basePos);
            currentLocalPos.add(displacement);

            const worldPos = new Vector3();
            worldPos.copy(currentLocalPos);
            worldPos.applyMatrix4(particlesGroup.matrixWorld);

            const projected = worldPos.clone().project(currentCamera);
            const screenX = (projected.x * 0.5 + 0.5) * currentCanvasWidth;
            const screenY = (-projected.y * 0.5 + 0.5) * currentCanvasHeight;

            const distDx = mouse.x - screenX;
            const distDy = mouse.y - screenY;
            const distanceSquared = distDx * distDx + distDy * distDy;

            if (
              distanceSquared < cursorRadiusSquared &&
              distanceSquared > 0 &&
              worldPos.z > 0
            ) {
              const distance = Math.sqrt(distanceSquared);
              const force = (cursorRadius - distance) / cursorRadius;
              const angle = Math.atan2(distDy, distDx);

              const cameraRight = new Vector3();
              const cameraUp = new Vector3();
              cameraRight
                .setFromMatrixColumn(currentCamera.matrixWorld, 0)
                .normalize();
              cameraUp
                .setFromMatrixColumn(currentCamera.matrixWorld, 1)
                .normalize();

              const repulsion2D = force * cursorStrength * speedN * deltaFactor;
              const repulsionX = -Math.cos(angle) * repulsion2D * 0.01;
              const repulsionY = Math.sin(angle) * repulsion2D * 0.01;

              const worldRepulsion = new Vector3();
              worldRepulsion.addScaledVector(cameraRight, repulsionX);
              worldRepulsion.addScaledVector(cameraUp, repulsionY);

              const localRepulsion = new Vector3();
              localRepulsion.copy(worldRepulsion);
              const inverseGroupMatrix = new Matrix4();
              inverseGroupMatrix.copy(particlesGroup.matrixWorld).invert();
              localRepulsion.applyMatrix4(inverseGroupMatrix);

              displacement.add(localRepulsion);
            }
          }

          const frictionFactor = Math.pow(CURSOR_PHYSICS.FRICTION, deltaFactor);
          const returnForce =
            CURSOR_PHYSICS.RETURN_FORCE * speedN * deltaFactor;
          displacement.multiplyScalar(frictionFactor);
          displacement.multiplyScalar(1 - returnForce);
        }
      }

      if (particleScatterVelocitiesRef.current.length > 0) {
        for (let i = 0; i < particleScatterVelocitiesRef.current.length; i++) {
          const scatterVelocity = particleScatterVelocitiesRef.current[i];
          const displacement = particleDisplacementsRef.current[i];

          displacement.addScaledVector(scatterVelocity, deltaFactor * 0.1);

          const scatterFriction = Math.pow(0.95, deltaFactor);
          scatterVelocity.multiplyScalar(scatterFriction);

          const scatterReturnForce =
            CURSOR_PHYSICS.RETURN_FORCE * speedN * deltaFactor;
          scatterVelocity.multiplyScalar(1 - scatterReturnForce);
        }
      }

      if (particlesRef.current) {
        const mat = new Matrix4();
        for (let i = 0; i < baseParticlePositionsRef.current.length; i++) {
          const basePos = baseParticlePositionsRef.current[i];
          const displacement = particleDisplacementsRef.current[i];
          const finalPos = new Vector3();
          finalPos.copy(basePos);
          finalPos.add(displacement);
          mat.setPosition(finalPos.x, finalPos.y, finalPos.z);
          particlesRef.current.setMatrixAt(i, mat);
        }
        particlesRef.current.instanceMatrix.needsUpdate = true;
      }

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animateCore);
      animationFrameRef.current = animationFrameId;
    };

    const startAnimation = () => {
      if (animationFrameId === null) {
        lastFrameTime = performance.now();
        animationFrameId = requestAnimationFrame(animateCore);
        animationFrameRef.current = animationFrameId;
      }
    };

    startAnimation();

    const handleMouseDown = (event) => {
      if (!drag) return;
      isDragging = true;
      velocity.x = 0;
      velocity.y = 0;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      lastDragTime = performance.now();

      const handleMouseMove = (moveEvent) => {
        const currentTime = performance.now();
        const timeSinceLastMove = currentTime - lastDragTime;

        const sensitivity = mapLinear(dragN, 0, 1, 0.001, 0.02);
        const mdx = moveEvent.clientX - lastMouseX;
        const mdy = moveEvent.clientY - lastMouseY;

        targetRotation.x += mdx * sensitivity;
        targetRotation.y += mdy * sensitivity;
        targetRotation.y = Math.max(
          -Math.PI / 2,
          Math.min(Math.PI / 2, targetRotation.y)
        );

        if (timeSinceLastMove > 0) {
          const timeNormalization = targetDeltaTime / timeSinceLastMove;
          velocity.x = mdx * sensitivity * 0.3 * timeNormalization;
          velocity.y = mdy * sensitivity * 0.3 * timeNormalization;
        }

        lastMouseX = moveEvent.clientX;
        lastMouseY = moveEvent.clientY;
        lastDragTime = currentTime;
      };

      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        isDragging = false;
      };

      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    };

    if (drag) {
      canvas.addEventListener("mousedown", handleMouseDown);
    }

    const handleMouseMoveCursor = (event) => {
      const containerRect = container.getBoundingClientRect();
      const mouseXInContainer = event.clientX - containerRect.left;
      const mouseYInContainer = event.clientY - containerRect.top;
      if (
        mouseXInContainer >= 0 &&
        mouseXInContainer <= containerRect.width &&
        mouseYInContainer >= 0 &&
        mouseYInContainer <= containerRect.height
      ) {
        mouseRef.current = {
          x: mouseXInContainer + offsetX,
          y: mouseYInContainer + offsetY,
        };
      } else {
        mouseRef.current = null;
      }
    };

    const handleMouseLeaveCursor = () => {
      mouseRef.current = null;
    };

    if (cursorOn) {
      window.addEventListener("mousemove", handleMouseMoveCursor);
      canvas.addEventListener("mouseleave", handleMouseLeaveCursor);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (drag) {
        canvas.removeEventListener("mousedown", handleMouseDown);
      }
      if (cursorOn) {
        window.removeEventListener("mousemove", handleMouseMoveCursor);
        canvas.removeEventListener("mouseleave", handleMouseLeaveCursor);
      }
      if (renderer.domElement && renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [
    particlesCount,
    speedN,
    smoothingN,
    scaleMultiplier,
    stopOnHover,
    rotationSpeed,
    dragSpeed,
    drag,
    particleSize,
    cursorOn,
    cursorRadius,
    cursorStrength,
    clickForce,
    sphereColor,
    coreColor,
    coreScale,
  ]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "340px",
        height: "311px",
        overflow: "visible",
        ...style,
      }}
    />
  );
}
