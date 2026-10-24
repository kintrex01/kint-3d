import * as THREE from "three";

/*
 * Efectos del visor 3D:
 *   - "escaneo": al abrir un archivo el modelo aparece de abajo hacia arriba
 *     con una línea de luz (mientras se analiza);
 *   - "impresion": simula la impresión capa por capa, con la boquilla
 *     moviéndose, la capa actual encendida y el interior "derretido" en
 *     naranja. Se puede reproducir o mover a mano (fijar).
 * Usa un plano de corte (clippingPlanes): el renderizador tiene que tener
 * localClippingEnabled = true.
 */

export type ModoEfecto = "escaneo" | "impresion";

type Restaurar = { material: THREE.Material; planos: THREE.Plane[] | null }[];

export class SimuladorCapas {
  private escena: THREE.Scene;
  private plano = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  private objeto: THREE.Object3D | null = null;
  private restaurar: Restaurar = [];
  private extras = new THREE.Group();
  private boquilla: THREE.Group | null = null;
  private caja = new THREE.Box3();
  private modo: ModoEfecto = "escaneo";
  private inicio = 0;
  private duracion = 1;
  private reproduciendo = false;
  private desdeFraccion = 0;
  private alTerminar: (() => void) | null = null;
  fraccion = 0;

  constructor(escena: THREE.Scene) {
    this.escena = escena;
    this.extras.name = "efecto-capas";
  }

  get activo() {
    return this.objeto !== null;
  }

  get modoActual() {
    return this.objeto ? this.modo : null;
  }

  get enPausa() {
    return this.activo && !this.reproduciendo;
  }

  /* Empieza un efecto sobre un objeto (ya ubicado en la escena). */
  empezar(objeto: THREE.Object3D, modo: ModoEfecto, duracionMs: number, alTerminar?: () => void) {
    this.detener();
    objeto.updateMatrixWorld(true);
    this.caja.setFromObject(objeto);
    if (this.caja.isEmpty()) return;
    this.objeto = objeto;
    this.modo = modo;
    this.duracion = Math.max(duracionMs, 1);
    this.alTerminar = alTerminar || null;

    // Plano de corte en todos los materiales del objeto (se restauran al terminar).
    objeto.traverse((hijo) => {
      const conMaterial = hijo as THREE.Mesh;
      if (!conMaterial.material) return;
      const materiales = Array.isArray(conMaterial.material) ? conMaterial.material : [conMaterial.material];
      for (const material of materiales) {
        this.restaurar.push({ material, planos: material.clippingPlanes });
        material.clippingPlanes = [this.plano];
        material.needsUpdate = true;
      }
    });

    const tamano = this.caja.getSize(new THREE.Vector3());
    const centro = this.caja.getCenter(new THREE.Vector3());
    const color = modo === "impresion" ? 0xff7a1a : 0x38bdf8;

    // Interior a la vista: las caras de atrás se pintan de color (parece macizo, recién derretido).
    objeto.traverse((hijo) => {
      const malla = hijo as THREE.Mesh;
      if (!malla.isMesh || hijo.name === "parches-reparacion") return;
      const relleno = new THREE.Mesh(
        malla.geometry,
        new THREE.MeshBasicMaterial({ color, side: THREE.BackSide, clippingPlanes: [this.plano] })
      );
      relleno.name = "efecto-relleno";
      relleno.matrixAutoUpdate = false;
      relleno.matrix.copy(malla.matrixWorld);
      this.extras.add(relleno);
    });

    // La capa actual: una lámina de luz con su contorno.
    const ancho = tamano.x * 1.12 + 2, fondo = tamano.z * 1.12 + 2;
    const lamina = new THREE.Mesh(
      new THREE.PlaneGeometry(ancho, fondo),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: modo === "impresion" ? 0.12 : 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    lamina.rotation.x = -Math.PI / 2;
    lamina.name = "efecto-lamina";
    const borde = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(ancho, fondo)),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 })
    );
    borde.rotation.x = -Math.PI / 2;
    borde.name = "efecto-borde";
    const capa = new THREE.Group();
    capa.name = "efecto-capa";
    capa.position.set(centro.x, this.caja.min.y, centro.z);
    capa.add(lamina, borde);
    this.extras.add(capa);

    // La boquilla (solo al imprimir).
    if (modo === "impresion") {
      const escala = Math.max(Math.min(Math.max(tamano.x, tamano.z) * 0.06, 18), 4);
      const boquilla = new THREE.Group();
      const cuerpo = new THREE.Mesh(
        new THREE.BoxGeometry(escala * 1.6, escala * 1.2, escala * 1.6),
        new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.4, roughness: 0.35 })
      );
      cuerpo.position.y = escala * 1.6;
      const punta = new THREE.Mesh(
        new THREE.ConeGeometry(escala * 0.45, escala * 0.9, 24),
        new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.85, roughness: 0.25 })
      );
      punta.rotation.x = Math.PI;
      punta.position.y = escala * 0.65;
      const brillo = new THREE.Mesh(
        new THREE.SphereGeometry(escala * 0.22, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0xffa040 })
      );
      brillo.position.y = escala * 0.12;
      boquilla.add(cuerpo, punta, brillo);
      boquilla.name = "efecto-boquilla";
      this.boquilla = boquilla;
      this.extras.add(boquilla);
    }

    this.escena.add(this.extras);
    this.reproducir(0);
  }

  reproducir(desde = this.fraccion) {
    if (!this.objeto) return;
    this.desdeFraccion = desde >= 1 ? 0 : desde;
    this.inicio = performance.now();
    this.reproduciendo = true;
  }

  pausar() {
    this.reproduciendo = false;
  }

  /* Mover a mano (0 = nada impreso, 1 = terminado). */
  fijar(fraccion: number) {
    this.reproduciendo = false;
    this.fraccion = Math.min(Math.max(fraccion, 0), 1);
    this.aplicar(performance.now());
  }

  /* Cada cuadro del visor. Devuelve true mientras hay efecto. */
  cuadro(ahora: number) {
    if (!this.objeto) return false;
    if (this.reproduciendo) {
      const t = (ahora - this.inicio) / this.duracion;
      const lineal = this.desdeFraccion + t * (1 - this.desdeFraccion);
      // El escaneo arranca y frena suave; la impresión va pareja, como la de verdad.
      this.fraccion = Math.min(1, this.modo === "escaneo" ? suavizar(Math.min(t, 1)) : lineal);
      if (this.fraccion >= 1) {
        this.reproduciendo = false;
        if (this.modo === "escaneo") {
          const listo = this.alTerminar;
          this.detener();
          listo?.();
          return false;
        }
        this.alTerminar?.();
      }
    }
    this.aplicar(ahora);
    return true;
  }

  private aplicar(ahora: number) {
    const alto = this.caja.max.y - this.caja.min.y;
    const y = this.caja.min.y + alto * this.fraccion + (this.fraccion >= 1 ? alto * 0.01 + 0.5 : 0);
    this.plano.constant = y;
    const capa = this.extras.getObjectByName("efecto-capa");
    if (capa) {
      capa.position.y = Math.min(y, this.caja.max.y);
      capa.visible = this.fraccion < 1;
      const lamina = capa.getObjectByName("efecto-lamina") as THREE.Mesh | undefined;
      if (lamina) (lamina.material as THREE.MeshBasicMaterial).opacity = (this.modo === "impresion" ? 0.1 : 0.16) + 0.06 * Math.sin(ahora / 120);
    }
    if (this.boquilla) {
      // Recorre la capa en zigzag, como la boquilla de verdad.
      const tamano = this.caja.getSize(new THREE.Vector3());
      const centro = this.caja.getCenter(new THREE.Vector3());
      const tiempo = ahora / 1000;
      this.boquilla.position.set(
        centro.x + (tamano.x / 2) * 0.9 * Math.sin(tiempo * 2.3),
        Math.min(y, this.caja.max.y),
        centro.z + (tamano.z / 2) * 0.9 * Math.sin(tiempo * 0.83 + 1.1)
      );
      this.boquilla.visible = this.fraccion < 1;
    }
  }

  detener() {
    for (const { material, planos } of this.restaurar) {
      material.clippingPlanes = planos;
      material.needsUpdate = true;
    }
    this.restaurar = [];
    this.escena.remove(this.extras);
    this.extras.traverse((hijo) => {
      const malla = hijo as THREE.Mesh;
      // La geometría de los rellenos es la del modelo: no se libera.
      if (malla.geometry && hijo.name !== "efecto-relleno") malla.geometry.dispose();
      const material = malla.material as THREE.Material | undefined;
      material?.dispose?.();
    });
    this.extras.clear();
    this.boquilla = null;
    this.objeto = null;
    this.reproduciendo = false;
    this.fraccion = 0;
  }
}

function suavizar(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/*
 * Volumen y superficie (en mm³ y mm²) de un objeto ya escalado en la escena,
 * para estimar gramos y tiempo de impresión.
 */
export function volumenYSuperficie(objeto: THREE.Mesh) {
  objeto.updateMatrixWorld(true);
  const posicion = objeto.geometry.getAttribute("position");
  const indice = objeto.geometry.getIndex();
  const total = indice ? indice.count : posicion.count;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let volumen = 0, superficie = 0;
  for (let i = 0; i + 2 < total; i += 3) {
    a.fromBufferAttribute(posicion, indice ? indice.getX(i) : i).applyMatrix4(objeto.matrixWorld);
    b.fromBufferAttribute(posicion, indice ? indice.getX(i + 1) : i + 1).applyMatrix4(objeto.matrixWorld);
    c.fromBufferAttribute(posicion, indice ? indice.getX(i + 2) : i + 2).applyMatrix4(objeto.matrixWorld);
    volumen += a.dot(b.clone().cross(c)) / 6;
    superficie += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
  }
  return { mm3: Math.abs(volumen), mm2: superficie };
}
