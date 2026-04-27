export type UserRole = 'supervisor' | 'superadmin';
export type EstadoOM = 'activa' | 'cerrada';
export type EstadoTL = 'pendiente' | 'afiliado' | 'sin_cubrir';
export type CategoriaPartida = 'AP' | 'BT' | 'MT' | 'SED';

export interface Usuario {
  uid: string;
  nombre: string;
  email: string;
  rol: UserRole;
  cuadrillaId?: string;
  cuadrillaNombre?: string;
  provincia?: string;
  activo?: boolean;
  createdAt?: string;
}

export interface Cuadrilla {
  id: string;
  nombre: string;
  provincia: string;
  supervisorId: string;
  supervisorNombre: string;
  supervisorEmail: string;
}

export interface Partida {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  categoria: CategoriaPartida;
  precio_unitario: number;
  codigo_sap: string;
}

export interface OrdenMantenimiento {
  id: string;
  numero_om: string;
  descripcion: string;
  zona: string;
  estado: EstadoOM;
  cuadrillas_ids: string[];
  cuadrillas_nombres: string[];
  creador_id: string;
  creador_nombre: string;
  fecha_emision: string;
  createdAt: string;
  total_valorizado?: number;
}

export interface ItemOM {
  id: string;
  orden_id: string;
  cuadrilla_id: string;
  cuadrilla_nombre: string;
  supervisor_id: string;
  supervisor_nombre: string;
  partida_id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  categoria: CategoriaPartida;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  fecha_ejecucion: string;
  observaciones: string;
  fotoUrl?: string;
  createdAt: string;
}

export interface TrabajoLibre {
  id: string;
  cuadrilla_id: string;
  cuadrilla_nombre: string;
  supervisor_id: string;
  supervisor_nombre: string;
  descripcion: string;
  fecha: string;
  estado: EstadoTL;
  orden_id_afiliada?: string;
  numero_om_afiliada?: string;
  fecha_afiliacion?: string;
  total_valorizado: number;
  createdAt: string;
}

export interface ItemTL {
  id: string;
  trabajo_libre_id: string;
  cuadrilla_id: string;
  supervisor_id: string;
  partida_id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  categoria: CategoriaPartida;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  fecha_ejecucion: string;
  observaciones: string;
  fotoUrl?: string;
  createdAt: string;
}

export interface AlertaCuadrilla {
  cuadrilla: Cuadrilla;
  diasSinActividad: number;
  ultimaActividad: string | null;
  nivel: 'ok' | 'warning' | 'danger';
}

export interface ResumenMensual {
  cuadrillaId: string;
  cuadrillaNombre: string;
  provincia: string;
  mes: number;
  anio: number;
  ordenes: {
    ordenId: string;
    numeroOM: string;
    descripcion: string;
    items: ItemOM[];
    subtotal: number;
  }[];
  trabajosLibres: {
    tlId: string;
    descripcion: string;
    items: ItemTL[];
    subtotal: number;
    afiliado: boolean;
  }[];
  totalGeneral: number;
}
