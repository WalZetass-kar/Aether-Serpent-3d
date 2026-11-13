import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import {
  applyCastlePbrMaterials,
  buildFantasyCastleGeometryGroup,
} from './castleBuilder';
import {
  buildCliffFormationsGeometryGroup,
  buildSanctuaryPedestalGeometryGroup,
  createWorldMossRockMaterial,
  ensureUv2,
} from './rockTerrainBuilder';
import type { PbrTextureSet } from './pbrTextures';

export interface MenuPbrTextureBank {
  rockPbr: PbrTextureSet;
  stonePbr: PbrTextureSet;
  slatePbr: PbrTextureSet;
  timberPbr: PbrTextureSet;
}

export interface SanctuaryLoadOptions {
  loadVistaGlbs?: boolean;
  shadowsEnabled?: boolean;
}

/**
 * Safely probes GPU compressed-texture (Basis/KTX2) capabilities without
 * issuing network requests for unhosted wasm transcoders.
 */
export function probeKtx2Capabilities(renderer: THREE.WebGLRenderer): string[] {
  const supported: string[] = [];
  try {
    const ktx2 = new KTX2Loader();
    ktx2.detectSupport(renderer);
    const gl = renderer.getContext();
    if (gl.getExtension('WEBGL_compressed_texture_astc')) supported.push('ASTC');
    if (gl.getExtension('EXT_texture_compression_bptc')) supported.push('BC7/BPTC');
    if (gl.getExtension('WEBGL_compressed_texture_etc')) supported.push('ETC2');
    if (gl.getExtension('WEBGL_compressed_texture_s3tc')) supported.push('S3TC/DXT');
    ktx2.dispose();
  } catch {
    // Graceful no-op on restricted WebGL contexts
  }
  return supported;
}

/**
 * Shared GLTF/GLB Asset Pipeline with Three.js Cache + LoadingManager + DRACOLoader
 * and seamless procedural fallback so zero external network errors ever disrupt rendering.
 */
export class MenuAssetPipeline {
  private loader: GLTFLoader;
  private draco: DRACOLoader;
  private disposed = false;

  constructor() {
    THREE.Cache.enabled = true;
    const manager = new THREE.LoadingManager();
    this.draco = new DRACOLoader(manager);
    this.loader = new GLTFLoader(manager);
    this.loader.setDRACOLoader(this.draco);
  }

  private async loadGlbWithFallback(
    url: string,
    buildFallback: () => THREE.Group,
    skipNetwork = false,
  ): Promise<THREE.Group> {
    if (skipNetwork) {
      return buildFallback();
    }
    try {
      const gltf = await this.loader.loadAsync(url);
      if (this.disposed) return new THREE.Group();
      return gltf.scene;
    } catch {
      return buildFallback();
    }
  }

  public async loadSanctuaryStructures(
    bank: MenuPbrTextureBank,
    options: SanctuaryLoadOptions = {},
  ): Promise<{
    castle: THREE.Group;
    cliffs: THREE.Group;
    pedestal: THREE.Group;
  }> {
    const skipGlbs = options.loadVistaGlbs === false;
    const shadowsEnabled = options.shadowsEnabled !== false;

    const [castle, cliffs, pedestal] = await Promise.all([
      this.loadGlbWithFallback('/models/fantasy_castle.glb', buildFantasyCastleGeometryGroup, skipGlbs),
      this.loadGlbWithFallback('/models/cliff_outcrops.glb', buildCliffFormationsGeometryGroup, skipGlbs),
      this.loadGlbWithFallback(
        '/models/sanctuary_pedestal.glb',
        buildSanctuaryPedestalGeometryGroup,
        skipGlbs,
      ),
    ]);

    if (this.disposed) {
      return {
        castle: new THREE.Group(),
        cliffs: new THREE.Group(),
        pedestal: new THREE.Group(),
      };
    }

    // Bind full PBR textures + UV2 + world-space moss shader onto loaded GLB meshes
    applyCastlePbrMaterials(castle, {
      stonePbr: bank.stonePbr,
      slatePbr: bank.slatePbr,
      timberPbr: bank.timberPbr,
    });
    if (!shadowsEnabled) {
      castle.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = false;
          obj.receiveShadow = false;
        }
      });
    }

    const cliffMat = createWorldMossRockMaterial(bank.rockPbr);
    cliffs.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        ensureUv2(mesh.geometry);
        mesh.material = cliffMat;
        mesh.castShadow = shadowsEnabled;
        mesh.receiveShadow = shadowsEnabled;
      }
    });

    const pedStoneMat = new THREE.MeshStandardMaterial({
      map: bank.stonePbr.map,
      normalMap: bank.stonePbr.normalMap,
      normalScale: new THREE.Vector2(1.2, 1.2),
      roughnessMap: bank.stonePbr.roughnessMap,
      aoMap: bank.stonePbr.aoMap,
      aoMapIntensity: 0.85,
      color: 0x94a3b8,
      roughness: 0.78,
      metalness: 0.08,
    });
    const pedGoldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.28,
      metalness: 0.86,
    });
    const pedRuneMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 1.55,
      roughness: 0.2,
    });

    pedestal.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const mesh = obj as THREE.Mesh;
      ensureUv2(mesh.geometry);
      if (mesh.name.includes('pedestal_gold')) {
        mesh.material = pedGoldMat;
        mesh.castShadow = shadowsEnabled;
      } else if (mesh.name.includes('pedestal_rune')) {
        mesh.material = pedRuneMat;
      } else {
        mesh.material = pedStoneMat;
        mesh.castShadow = shadowsEnabled;
        mesh.receiveShadow = shadowsEnabled;
      }
    });

    return { castle, cliffs, pedestal };
  }

  public dispose(): void {
    this.disposed = true;
    this.draco.dispose();
  }
}
