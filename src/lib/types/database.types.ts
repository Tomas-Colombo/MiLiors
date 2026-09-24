// Tipos del esquema `public`, derivados del esquema vivo que publica
// PostgREST en /rest/v1/ (la misma base que lee `supabase gen types`).
// NO EDITAR A MANO. Regenerar con: node scripts/gen-database-types.mjs

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      aceptacion_tyc: {
        Row: {
          fecha_aceptacion: string
          id: string
          tyc_id: string
          usuario_id: string
        }
        Insert: {
          fecha_aceptacion?: string
          id?: string
          tyc_id: string
          usuario_id: string
        }
        Update: {
          fecha_aceptacion?: string
          id?: string
          tyc_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "aceptacion_tyc_tyc_id_fkey"
            columns: ["tyc_id"]
            isOneToOne: false
            referencedRelation: "terminos_y_condiciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "aceptacion_tyc_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: false
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      carrera: {
        Row: {
          created_at: string
          fecha_baja: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          fecha_baja?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          fecha_baja?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      certificado_pdf: {
        Row: {
          created_at: string
          desactualizado: boolean
          id: string
          postulante_id: string
          timestamp_firma: string
        }
        Insert: {
          created_at?: string
          desactualizado?: boolean
          id?: string
          postulante_id: string
          timestamp_firma?: string
        }
        Update: {
          created_at?: string
          desactualizado?: boolean
          id?: string
          postulante_id?: string
          timestamp_firma?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificado_pdf_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
        ]
      }
      competencia: {
        Row: {
          created_at: string
          fecha_baja: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          fecha_baja?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          fecha_baja?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      configuracion_sistema: {
        Row: {
          dias_inactividad_cierre: number
          dias_reactivar_feedback: number
          id: boolean
          updated_at: string
        }
        Insert: {
          dias_inactividad_cierre?: number
          dias_reactivar_feedback?: number
          id?: boolean
          updated_at?: string
        }
        Update: {
          dias_inactividad_cierre?: number
          dias_reactivar_feedback?: number
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      consulta_asistente_ia: {
        Row: {
          estado: Database["public"]["Enums"]["estado_consulta_ia"]
          fecha_consulta: string
          id: string
          postulante_id: string | null
          pregunta_reclutador: string
          puesto_id: string | null
          reclutador_id: string
          respuesta_ia: string | null
          updated_at: string
        }
        Insert: {
          estado?: Database["public"]["Enums"]["estado_consulta_ia"]
          fecha_consulta?: string
          id?: string
          postulante_id?: string | null
          pregunta_reclutador: string
          puesto_id?: string | null
          reclutador_id: string
          respuesta_ia?: string | null
          updated_at?: string
        }
        Update: {
          estado?: Database["public"]["Enums"]["estado_consulta_ia"]
          fecha_consulta?: string
          id?: string
          postulante_id?: string | null
          pregunta_reclutador?: string
          puesto_id?: string | null
          reclutador_id?: string
          respuesta_ia?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "consulta_asistente_ia_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consulta_asistente_ia_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puesto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consulta_asistente_ia_reclutador_id_fkey"
            columns: ["reclutador_id"]
            isOneToOne: false
            referencedRelation: "perfil_reclutador"
            referencedColumns: ["id"]
          },
        ]
      }
      contratacion: {
        Row: {
          created_at: string
          fecha_contratacion: string
          historial_puesto_id: string
          id: string
          nombre_externo: string | null
          postulante_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fecha_contratacion?: string
          historial_puesto_id: string
          id?: string
          nombre_externo?: string | null
          postulante_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fecha_contratacion?: string
          historial_puesto_id?: string
          id?: string
          nombre_externo?: string | null
          postulante_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contratacion_historial_puesto_id_fkey"
            columns: ["historial_puesto_id"]
            isOneToOne: false
            referencedRelation: "historial_puesto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contratacion_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
        ]
      }
      curso: {
        Row: {
          created_at: string
          duracion_horas: number | null
          fecha_fin: string | null
          id: string
          institucion: string
          nombre: string
          perfil_tecnico_id: string
          updated_at: string
          url_credencial: string | null
        }
        Insert: {
          created_at?: string
          duracion_horas?: number | null
          fecha_fin?: string | null
          id?: string
          institucion: string
          nombre: string
          perfil_tecnico_id: string
          updated_at?: string
          url_credencial?: string | null
        }
        Update: {
          created_at?: string
          duracion_horas?: number | null
          fecha_fin?: string | null
          id?: string
          institucion?: string
          nombre?: string
          perfil_tecnico_id?: string
          updated_at?: string
          url_credencial?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "curso_perfil_tecnico_id_fkey"
            columns: ["perfil_tecnico_id"]
            isOneToOne: false
            referencedRelation: "perfil_tecnico"
            referencedColumns: ["id"]
          },
        ]
      }
      departamento: {
        Row: {
          codigo_indec: string | null
          created_at: string
          fecha_baja: string | null
          id: string
          nombre: string
          provincia_id: string
        }
        Insert: {
          codigo_indec?: string | null
          created_at?: string
          fecha_baja?: string | null
          id?: string
          nombre: string
          provincia_id: string
        }
        Update: {
          codigo_indec?: string | null
          created_at?: string
          fecha_baja?: string | null
          id?: string
          nombre?: string
          provincia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "departamento_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "provincia"
            referencedColumns: ["id"]
          },
        ]
      }
      empresa: {
        Row: {
          created_at: string
          descripcion: string | null
          fecha_baja: string | null
          id: string
          link_url: string | null
          nombre_empresa: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          fecha_baja?: string | null
          id?: string
          link_url?: string | null
          nombre_empresa: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          fecha_baja?: string | null
          id?: string
          link_url?: string | null
          nombre_empresa?: string
          updated_at?: string
        }
        Relationships: []
      }
      eneatipo: {
        Row: {
          apodos: string[] | null
          created_at: string
          descripcion: string | null
          deseo_basico: string | null
          fecha_baja: string | null
          id: string
          mensaje_superyo: string | null
          miedo_basico: string | null
          nombre: string
          numero_eneatipo: number
        }
        Insert: {
          apodos?: string[] | null
          created_at?: string
          descripcion?: string | null
          deseo_basico?: string | null
          fecha_baja?: string | null
          id?: string
          mensaje_superyo?: string | null
          miedo_basico?: string | null
          nombre: string
          numero_eneatipo: number
        }
        Update: {
          apodos?: string[] | null
          created_at?: string
          descripcion?: string | null
          deseo_basico?: string | null
          fecha_baja?: string | null
          id?: string
          mensaje_superyo?: string | null
          miedo_basico?: string | null
          nombre?: string
          numero_eneatipo?: number
        }
        Relationships: []
      }
      experiencia_laboral: {
        Row: {
          created_at: string
          descripcion: string | null
          empresa: string
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          perfil_tecnico_id: string
          puesto: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          empresa: string
          fecha_fin?: string | null
          fecha_inicio: string
          id?: string
          perfil_tecnico_id: string
          puesto: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          empresa?: string
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          perfil_tecnico_id?: string
          puesto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiencia_laboral_perfil_tecnico_id_fkey"
            columns: ["perfil_tecnico_id"]
            isOneToOne: false
            referencedRelation: "perfil_tecnico"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_informe: {
        Row: {
          comentario: string | null
          created_at: string
          id: string
          informe_generado_at: string
          informe_id: string
          postulante_id: string
          representatividad: number
          updated_at: string
        }
        Insert: {
          comentario?: string | null
          created_at?: string
          id?: string
          informe_generado_at: string
          informe_id: string
          postulante_id: string
          representatividad: number
          updated_at?: string
        }
        Update: {
          comentario?: string | null
          created_at?: string
          id?: string
          informe_generado_at?: string
          informe_id?: string
          postulante_id?: string
          representatividad?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_informe_informe_id_fkey"
            columns: ["informe_id"]
            isOneToOne: true
            referencedRelation: "informe_personalidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_informe_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_informe_competencia: {
        Row: {
          competencia_key: string
          created_at: string
          id: string
          informe_generado_at: string
          informe_id: string
          nivel_mostrado: string
          postulante_id: string
          updated_at: string
          valoracion: Database["public"]["Enums"]["valoracion_competencia"]
        }
        Insert: {
          competencia_key: string
          created_at?: string
          id?: string
          informe_generado_at: string
          informe_id: string
          nivel_mostrado: string
          postulante_id: string
          updated_at?: string
          valoracion: Database["public"]["Enums"]["valoracion_competencia"]
        }
        Update: {
          competencia_key?: string
          created_at?: string
          id?: string
          informe_generado_at?: string
          informe_id?: string
          nivel_mostrado?: string
          postulante_id?: string
          updated_at?: string
          valoracion?: Database["public"]["Enums"]["valoracion_competencia"]
        }
        Relationships: [
          {
            foreignKeyName: "feedback_informe_competencia_informe_id_fkey"
            columns: ["informe_id"]
            isOneToOne: false
            referencedRelation: "informe_personalidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_informe_competencia_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_informe_seccion: {
        Row: {
          created_at: string
          id: string
          informe_generado_at: string
          informe_id: string
          postulante_id: string
          puntaje: number
          seccion_key: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          informe_generado_at: string
          informe_id: string
          postulante_id: string
          puntaje: number
          seccion_key: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          informe_generado_at?: string
          informe_id?: string
          postulante_id?: string
          puntaje?: number
          seccion_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_informe_seccion_informe_id_fkey"
            columns: ["informe_id"]
            isOneToOne: false
            referencedRelation: "informe_personalidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feedback_informe_seccion_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
        ]
      }
      formacion_academica: {
        Row: {
          created_at: string
          fecha_graduacion: string | null
          id: string
          institucion: string
          perfil_tecnico_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fecha_graduacion?: string | null
          id?: string
          institucion: string
          perfil_tecnico_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fecha_graduacion?: string | null
          id?: string
          institucion?: string
          perfil_tecnico_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formacion_academica_perfil_tecnico_id_fkey"
            columns: ["perfil_tecnico_id"]
            isOneToOne: false
            referencedRelation: "perfil_tecnico"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_preselector: {
        Row: {
          created_at: string
          id: string
          puesto_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          puesto_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          puesto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulario_preselector_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: true
            referencedRelation: "puesto"
            referencedColumns: ["id"]
          },
        ]
      }
      historial_puesto: {
        Row: {
          fecha_fin: string | null
          fecha_inicio: string
          id: string
          puesto_id: string
        }
        Insert: {
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          puesto_id: string
        }
        Update: {
          fecha_fin?: string | null
          fecha_inicio?: string
          id?: string
          puesto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historial_puesto_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puesto"
            referencedColumns: ["id"]
          },
        ]
      }
      idioma: {
        Row: {
          created_at: string
          id: string
          nivel_idioma: Database["public"]["Enums"]["nivel_idioma"]
          nombre: string
          perfil_tecnico_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nivel_idioma: Database["public"]["Enums"]["nivel_idioma"]
          nombre: string
          perfil_tecnico_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nivel_idioma?: Database["public"]["Enums"]["nivel_idioma"]
          nombre?: string
          perfil_tecnico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "idioma_perfil_tecnico_id_fkey"
            columns: ["perfil_tecnico_id"]
            isOneToOne: false
            referencedRelation: "perfil_tecnico"
            referencedColumns: ["id"]
          },
        ]
      }
      idioma_catalogo: {
        Row: {
          created_at: string
          fecha_baja: string | null
          id: string
          nombre: string
        }
        Insert: {
          created_at?: string
          fecha_baja?: string | null
          id?: string
          nombre: string
        }
        Update: {
          created_at?: string
          fecha_baja?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      informe_anexo: {
        Row: {
          contenido: Json
          created_at: string
          id: string
          informe_id: string
          postulante_id: string
          updated_at: string
        }
        Insert: {
          contenido: Json
          created_at?: string
          id?: string
          informe_id: string
          postulante_id: string
          updated_at?: string
        }
        Update: {
          contenido?: Json
          created_at?: string
          id?: string
          informe_id?: string
          postulante_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "informe_anexo_informe_id_fkey"
            columns: ["informe_id"]
            isOneToOne: true
            referencedRelation: "informe_personalidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "informe_anexo_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
        ]
      }
      informe_auditoria: {
        Row: {
          created_at: string
          entrada: Json
          id: string
          informe_id: string | null
          intento: number
          modelo: string | null
          motivo: string | null
          ok: boolean
          postulante_id: string
          salida: string | null
          system_prompt: string
          tokens_entrada: number | null
          tokens_salida: number | null
          user_prompt: string
        }
        Insert: {
          created_at?: string
          entrada: Json
          id?: string
          informe_id?: string | null
          intento: number
          modelo?: string | null
          motivo?: string | null
          ok: boolean
          postulante_id: string
          salida?: string | null
          system_prompt: string
          tokens_entrada?: number | null
          tokens_salida?: number | null
          user_prompt: string
        }
        Update: {
          created_at?: string
          entrada?: Json
          id?: string
          informe_id?: string | null
          intento?: number
          modelo?: string | null
          motivo?: string | null
          ok?: boolean
          postulante_id?: string
          salida?: string | null
          system_prompt?: string
          tokens_entrada?: number | null
          tokens_salida?: number | null
          user_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "informe_auditoria_informe_id_fkey"
            columns: ["informe_id"]
            isOneToOne: false
            referencedRelation: "informe_personalidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "informe_auditoria_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
        ]
      }
      informe_personalidad: {
        Row: {
          contenido_informe: string | null
          contenido_json: Json | null
          desactualizado: boolean
          estado_informe: Database["public"]["Enums"]["estado_informe"]
          fecha_generacion: string
          id: string
          postulante_id: string
          updated_at: string
        }
        Insert: {
          contenido_informe?: string | null
          contenido_json?: Json | null
          desactualizado?: boolean
          estado_informe?: Database["public"]["Enums"]["estado_informe"]
          fecha_generacion?: string
          id?: string
          postulante_id: string
          updated_at?: string
        }
        Update: {
          contenido_informe?: string | null
          contenido_json?: Json | null
          desactualizado?: boolean
          estado_informe?: Database["public"]["Enums"]["estado_informe"]
          fecha_generacion?: string
          id?: string
          postulante_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "informe_personalidad_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: true
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
        ]
      }
      localidad: {
        Row: {
          codigo_indec: string | null
          created_at: string
          departamento_id: string
          fecha_baja: string | null
          id: string
          nombre: string
        }
        Insert: {
          codigo_indec?: string | null
          created_at?: string
          departamento_id: string
          fecha_baja?: string | null
          id?: string
          nombre: string
        }
        Update: {
          codigo_indec?: string | null
          created_at?: string
          departamento_id?: string
          fecha_baja?: string | null
          id?: string
          nombre?: string
        }
        Relationships: [
          {
            foreignKeyName: "localidad_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamento"
            referencedColumns: ["id"]
          },
        ]
      }
      nota_privada: {
        Row: {
          contenido: string
          fecha_creacion: string
          id: string
          postulante_id: string
          puesto_id: string | null
          reclutador_id: string
          updated_at: string
        }
        Insert: {
          contenido: string
          fecha_creacion?: string
          id?: string
          postulante_id: string
          puesto_id?: string | null
          reclutador_id: string
          updated_at?: string
        }
        Update: {
          contenido?: string
          fecha_creacion?: string
          id?: string
          postulante_id?: string
          puesto_id?: string | null
          reclutador_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nota_privada_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_privada_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puesto"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nota_privada_reclutador_id_fkey"
            columns: ["reclutador_id"]
            isOneToOne: false
            referencedRelation: "perfil_reclutador"
            referencedColumns: ["id"]
          },
        ]
      }
      opcion_pregunta_preselector: {
        Row: {
          es_valida: boolean
          id: string
          orden: number
          pregunta_id: string
          texto: string
        }
        Insert: {
          es_valida?: boolean
          id?: string
          orden: number
          pregunta_id: string
          texto: string
        }
        Update: {
          es_valida?: boolean
          id?: string
          orden?: number
          pregunta_id?: string
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "opcion_pregunta_preselector_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "pregunta_preselector"
            referencedColumns: ["id"]
          },
        ]
      }
      opcion_respuesta: {
        Row: {
          id: string
          texto_opcion: string
          valor_numerico: number
        }
        Insert: {
          id?: string
          texto_opcion: string
          valor_numerico: number
        }
        Update: {
          id?: string
          texto_opcion?: string
          valor_numerico?: number
        }
        Relationships: []
      }
      perfil_postulante: {
        Row: {
          carrera_id: string | null
          carrera_otra: string | null
          created_at: string
          enlace_linkedin: string | null
          fecha_hora_nacimiento: string | null
          id: string
          localidad_id: string | null
          mostrar_personalidad_publico: boolean
          nombre_completo: string
          nombre_preferido: string | null
          perfil_en_busqueda: boolean
          portfolio: string | null
          provincia_id: string
          telefono: string | null
          ultima_conexion: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          carrera_id?: string | null
          carrera_otra?: string | null
          created_at?: string
          enlace_linkedin?: string | null
          fecha_hora_nacimiento?: string | null
          id?: string
          localidad_id?: string | null
          mostrar_personalidad_publico?: boolean
          nombre_completo: string
          nombre_preferido?: string | null
          perfil_en_busqueda?: boolean
          portfolio?: string | null
          provincia_id: string
          telefono?: string | null
          ultima_conexion?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          carrera_id?: string | null
          carrera_otra?: string | null
          created_at?: string
          enlace_linkedin?: string | null
          fecha_hora_nacimiento?: string | null
          id?: string
          localidad_id?: string | null
          mostrar_personalidad_publico?: boolean
          nombre_completo?: string
          nombre_preferido?: string | null
          perfil_en_busqueda?: boolean
          portfolio?: string | null
          provincia_id?: string
          telefono?: string | null
          ultima_conexion?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_postulante_carrera_id_fkey"
            columns: ["carrera_id"]
            isOneToOne: false
            referencedRelation: "carrera"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfil_postulante_localidad_id_fkey"
            columns: ["localidad_id"]
            isOneToOne: false
            referencedRelation: "localidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfil_postulante_provincia_id_fkey"
            columns: ["provincia_id"]
            isOneToOne: false
            referencedRelation: "provincia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfil_postulante_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_reclutador: {
        Row: {
          created_at: string
          empresa_id: string | null
          fecha_baja: string | null
          id: string
          nombre_reclutador: string
          ultima_conexion: string | null
          updated_at: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          empresa_id?: string | null
          fecha_baja?: string | null
          id?: string
          nombre_reclutador: string
          ultima_conexion?: string | null
          updated_at?: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string | null
          fecha_baja?: string | null
          id?: string
          nombre_reclutador?: string
          ultima_conexion?: string | null
          updated_at?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_reclutador_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "perfil_reclutador_usuario_id_fkey"
            columns: ["usuario_id"]
            isOneToOne: true
            referencedRelation: "usuario"
            referencedColumns: ["id"]
          },
        ]
      }
      perfil_tecnico: {
        Row: {
          fecha_actualizacion: string
          id: string
          postulante_id: string
          resumen_profesional_llm: string | null
          sintesis_certificado: Json | null
          sintesis_estado: string
        }
        Insert: {
          fecha_actualizacion?: string
          id?: string
          postulante_id: string
          resumen_profesional_llm?: string | null
          sintesis_certificado?: Json | null
          sintesis_estado?: string
        }
        Update: {
          fecha_actualizacion?: string
          id?: string
          postulante_id?: string
          resumen_profesional_llm?: string | null
          sintesis_certificado?: Json | null
          sintesis_estado?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfil_tecnico_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: true
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
        ]
      }
      postulacion: {
        Row: {
          estado: Database["public"]["Enums"]["estado_postulacion"]
          fecha_postulacion: string
          historial_puesto_id: string
          id: string
          marca: string | null
          motivo_descarte: string | null
          postulante_id: string
          puesto_id: string
          updated_at: string
        }
        Insert: {
          estado?: Database["public"]["Enums"]["estado_postulacion"]
          fecha_postulacion?: string
          historial_puesto_id: string
          id?: string
          marca?: string | null
          motivo_descarte?: string | null
          postulante_id: string
          puesto_id: string
          updated_at?: string
        }
        Update: {
          estado?: Database["public"]["Enums"]["estado_postulacion"]
          fecha_postulacion?: string
          historial_puesto_id?: string
          id?: string
          marca?: string | null
          motivo_descarte?: string | null
          postulante_id?: string
          puesto_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "postulacion_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: false
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulacion_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puesto"
            referencedColumns: ["id"]
          },
        ]
      }
      postulante_competencia: {
        Row: {
          competencia_id: string
          id: string
          nivel: Database["public"]["Enums"]["nivel_competencia"]
          perfil_tecnico_id: string
        }
        Insert: {
          competencia_id: string
          id?: string
          nivel?: Database["public"]["Enums"]["nivel_competencia"]
          perfil_tecnico_id: string
        }
        Update: {
          competencia_id?: string
          id?: string
          nivel?: Database["public"]["Enums"]["nivel_competencia"]
          perfil_tecnico_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "postulante_competencia_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postulante_competencia_perfil_tecnico_id_fkey"
            columns: ["perfil_tecnico_id"]
            isOneToOne: false
            referencedRelation: "perfil_tecnico"
            referencedColumns: ["id"]
          },
        ]
      }
      pregunta_eneagrama: {
        Row: {
          codigo_original: string | null
          eneatipo_asociado: number
          enunciado: string
          fecha_baja: string | null
          fecha_creacion: string
          id: string
          numero_pregunta: number
          pausada: boolean
        }
        Insert: {
          codigo_original?: string | null
          eneatipo_asociado: number
          enunciado: string
          fecha_baja?: string | null
          fecha_creacion?: string
          id?: string
          numero_pregunta: number
          pausada?: boolean
        }
        Update: {
          codigo_original?: string | null
          eneatipo_asociado?: number
          enunciado?: string
          fecha_baja?: string | null
          fecha_creacion?: string
          id?: string
          numero_pregunta?: number
          pausada?: boolean
        }
        Relationships: []
      }
      pregunta_preselector: {
        Row: {
          created_at: string
          es_critica: boolean
          formulario_id: string
          id: string
          orden: number
          texto: string
          tipo: Database["public"]["Enums"]["tipo_pregunta_preselector"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          es_critica?: boolean
          formulario_id: string
          id?: string
          orden: number
          texto: string
          tipo: Database["public"]["Enums"]["tipo_pregunta_preselector"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          es_critica?: boolean
          formulario_id?: string
          id?: string
          orden?: number
          texto?: string
          tipo?: Database["public"]["Enums"]["tipo_pregunta_preselector"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pregunta_preselector_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formulario_preselector"
            referencedColumns: ["id"]
          },
        ]
      }
      provincia: {
        Row: {
          codigo_indec: string | null
          created_at: string
          fecha_baja: string | null
          id: string
          nombre: string
        }
        Insert: {
          codigo_indec?: string | null
          created_at?: string
          fecha_baja?: string | null
          id?: string
          nombre: string
        }
        Update: {
          codigo_indec?: string | null
          created_at?: string
          fecha_baja?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      puesto: {
        Row: {
          activo: boolean
          carga_horaria: Database["public"]["Enums"]["carga_horaria"]
          created_at: string
          departamento_id: string | null
          descripcion_texto: string | null
          empresa_id: string
          fecha_baja_puesto: string | null
          fecha_publicacion: string
          fecha_ultima_actividad: string
          id: string
          idioma: string
          localidad_id: string | null
          nivel_experiencia: string | null
          perfil_psicologico_deseado: string | null
          reclutador_id: string
          sector_id: string | null
          titulo_puesto: string
          ubicacion: Database["public"]["Enums"]["ubicacion"]
          updated_at: string
        }
        Insert: {
          activo?: boolean
          carga_horaria: Database["public"]["Enums"]["carga_horaria"]
          created_at?: string
          departamento_id?: string | null
          descripcion_texto?: string | null
          empresa_id: string
          fecha_baja_puesto?: string | null
          fecha_publicacion?: string
          fecha_ultima_actividad?: string
          id?: string
          idioma?: string
          localidad_id?: string | null
          nivel_experiencia?: string | null
          perfil_psicologico_deseado?: string | null
          reclutador_id: string
          sector_id?: string | null
          titulo_puesto: string
          ubicacion: Database["public"]["Enums"]["ubicacion"]
          updated_at?: string
        }
        Update: {
          activo?: boolean
          carga_horaria?: Database["public"]["Enums"]["carga_horaria"]
          created_at?: string
          departamento_id?: string | null
          descripcion_texto?: string | null
          empresa_id?: string
          fecha_baja_puesto?: string | null
          fecha_publicacion?: string
          fecha_ultima_actividad?: string
          id?: string
          idioma?: string
          localidad_id?: string | null
          nivel_experiencia?: string | null
          perfil_psicologico_deseado?: string | null
          reclutador_id?: string
          sector_id?: string | null
          titulo_puesto?: string
          ubicacion?: Database["public"]["Enums"]["ubicacion"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "puesto_departamento_id_fkey"
            columns: ["departamento_id"]
            isOneToOne: false
            referencedRelation: "departamento"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puesto_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puesto_localidad_id_fkey"
            columns: ["localidad_id"]
            isOneToOne: false
            referencedRelation: "localidad"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puesto_reclutador_id_fkey"
            columns: ["reclutador_id"]
            isOneToOne: false
            referencedRelation: "perfil_reclutador"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puesto_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sector_industrial"
            referencedColumns: ["id"]
          },
        ]
      }
      puesto_carrera: {
        Row: {
          carrera_id: string
          puesto_id: string
        }
        Insert: {
          carrera_id: string
          puesto_id: string
        }
        Update: {
          carrera_id?: string
          puesto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "puesto_carrera_carrera_id_fkey"
            columns: ["carrera_id"]
            isOneToOne: false
            referencedRelation: "carrera"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "puesto_carrera_puesto_id_fkey"
            columns: ["puesto_id"]
            isOneToOne: false
            referencedRelation: "puesto"
            referencedColumns: ["id"]
          },
        ]
      }
      reclutador_empresa: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          reclutador_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          reclutador_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          reclutador_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reclutador_empresa_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresa"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reclutador_empresa_reclutador_id_fkey"
            columns: ["reclutador_id"]
            isOneToOne: false
            referencedRelation: "perfil_reclutador"
            referencedColumns: ["id"]
          },
        ]
      }
      respuesta_item_eneagrama: {
        Row: {
          id: string
          pregunta_id: string
          test_eneagrama_id: string
          valor_respondido: number
        }
        Insert: {
          id?: string
          pregunta_id: string
          test_eneagrama_id: string
          valor_respondido: number
        }
        Update: {
          id?: string
          pregunta_id?: string
          test_eneagrama_id?: string
          valor_respondido?: number
        }
        Relationships: [
          {
            foreignKeyName: "respuesta_item_eneagrama_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "pregunta_eneagrama"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuesta_item_eneagrama_test_eneagrama_id_fkey"
            columns: ["test_eneagrama_id"]
            isOneToOne: false
            referencedRelation: "test_eneagrama"
            referencedColumns: ["id"]
          },
        ]
      }
      respuesta_preselector: {
        Row: {
          created_at: string
          id: string
          opcion_id: string | null
          postulacion_id: string
          pregunta_id: string
          texto_libre: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          opcion_id?: string | null
          postulacion_id: string
          pregunta_id: string
          texto_libre?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          opcion_id?: string | null
          postulacion_id?: string
          pregunta_id?: string
          texto_libre?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "respuesta_preselector_opcion_id_fkey"
            columns: ["opcion_id"]
            isOneToOne: false
            referencedRelation: "opcion_pregunta_preselector"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuesta_preselector_postulacion_id_fkey"
            columns: ["postulacion_id"]
            isOneToOne: false
            referencedRelation: "postulacion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "respuesta_preselector_pregunta_id_fkey"
            columns: ["pregunta_id"]
            isOneToOne: false
            referencedRelation: "pregunta_preselector"
            referencedColumns: ["id"]
          },
        ]
      }
      resultado_puntaje_eneagrama: {
        Row: {
          eneatipo_numero: number
          id: string
          porcentaje: number
          puntaje_crudo: number
          test_eneagrama_id: string
        }
        Insert: {
          eneatipo_numero: number
          id?: string
          porcentaje: number
          puntaje_crudo: number
          test_eneagrama_id: string
        }
        Update: {
          eneatipo_numero?: number
          id?: string
          porcentaje?: number
          puntaje_crudo?: number
          test_eneagrama_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resultado_puntaje_eneagrama_test_eneagrama_id_fkey"
            columns: ["test_eneagrama_id"]
            isOneToOne: false
            referencedRelation: "test_eneagrama"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_industrial: {
        Row: {
          created_at: string
          fecha_baja_s: string | null
          id: string
          nombre_sector: string
        }
        Insert: {
          created_at?: string
          fecha_baja_s?: string | null
          id?: string
          nombre_sector: string
        }
        Update: {
          created_at?: string
          fecha_baja_s?: string | null
          id?: string
          nombre_sector?: string
        }
        Relationships: []
      }
      sesion_actividad: {
        Row: {
          actualizado_en: string
          revocada: boolean
          ultima_actividad: string
          usuario_id: string
        }
        Insert: {
          actualizado_en?: string
          revocada?: boolean
          ultima_actividad?: string
          usuario_id: string
        }
        Update: {
          actualizado_en?: string
          revocada?: boolean
          ultima_actividad?: string
          usuario_id?: string
        }
        Relationships: []
      }
      terminos_y_condiciones: {
        Row: {
          descripcion: string
          fecha_baja_tyc: string | null
          fecha_publicacion: string
          id: string
          version: string
        }
        Insert: {
          descripcion: string
          fecha_baja_tyc?: string | null
          fecha_publicacion?: string
          id?: string
          version: string
        }
        Update: {
          descripcion?: string
          fecha_baja_tyc?: string | null
          fecha_publicacion?: string
          id?: string
          version?: string
        }
        Relationships: []
      }
      test_eneagrama: {
        Row: {
          ala: number | null
          dominantes_empate: number[] | null
          fecha_realizacion: string
          id: string
          postulante_id: string
          tiene_empate_ala: boolean
          tiene_empate_dominante: boolean
          updated_at: string
          veces_completado: number
        }
        Insert: {
          ala?: number | null
          dominantes_empate?: number[] | null
          fecha_realizacion?: string
          id?: string
          postulante_id: string
          tiene_empate_ala?: boolean
          tiene_empate_dominante?: boolean
          updated_at?: string
          veces_completado?: number
        }
        Update: {
          ala?: number | null
          dominantes_empate?: number[] | null
          fecha_realizacion?: string
          id?: string
          postulante_id?: string
          tiene_empate_ala?: boolean
          tiene_empate_dominante?: boolean
          updated_at?: string
          veces_completado?: number
        }
        Relationships: [
          {
            foreignKeyName: "test_eneagrama_postulante_id_fkey"
            columns: ["postulante_id"]
            isOneToOne: true
            referencedRelation: "perfil_postulante"
            referencedColumns: ["id"]
          },
        ]
      }
      test_eneagrama_dominante: {
        Row: {
          eneatipo_id: string
          id: string
          porcentaje: number
          puntaje_crudo: number
          test_eneagrama_id: string
        }
        Insert: {
          eneatipo_id: string
          id?: string
          porcentaje: number
          puntaje_crudo: number
          test_eneagrama_id: string
        }
        Update: {
          eneatipo_id?: string
          id?: string
          porcentaje?: number
          puntaje_crudo?: number
          test_eneagrama_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_eneagrama_dominante_eneatipo_id_fkey"
            columns: ["eneatipo_id"]
            isOneToOne: false
            referencedRelation: "eneatipo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_eneagrama_dominante_test_eneagrama_id_fkey"
            columns: ["test_eneagrama_id"]
            isOneToOne: false
            referencedRelation: "test_eneagrama"
            referencedColumns: ["id"]
          },
        ]
      }
      usuario: {
        Row: {
          email: string
          fecha_baja: string | null
          fecha_creacion: string
          id: string
          rol_usuario: Database["public"]["Enums"]["rol_usuario"]
        }
        Insert: {
          email: string
          fecha_baja?: string | null
          fecha_creacion?: string
          id?: string
          rol_usuario: Database["public"]["Enums"]["rol_usuario"]
        }
        Update: {
          email?: string
          fecha_baja?: string | null
          fecha_creacion?: string
          id?: string
          rol_usuario?: Database["public"]["Enums"]["rol_usuario"]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cerrar_puestos_inactivos: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      check_session: {
        Args: Record<PropertyKey, never>
        Returns: string | null
      }
      get_my_rol: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["rol_usuario"]
      }
      reclutador_ve_postulante: {
        Args: { p_postulante_id: string }
        Returns: boolean
      }
      touch_session_activity: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      carga_horaria: 'TIEMPO_COMPLETO' | 'MEDIO_TIEMPO' | 'POR_HORAS_FREELANCE'
      estado_consulta_ia: 'PENDIENTE' | 'LISTO'
      estado_informe: 'PENDIENTE' | 'LISTO' | 'ERROR'
      estado_postulacion: 'ENVIADA' | 'VISTO' | 'PROCESO_FINALIZADO' | 'CERRADA'
      nivel_competencia: 'BASICO' | 'INTERMEDIO' | 'AVANZADO'
      nivel_idioma: 'BASICO' | 'INTERMEDIO' | 'AVANZADO' | 'NATIVO'
      rol_usuario: 'ADMIN' | 'POSTULANTE' | 'RECLUTADOR'
      tipo_pregunta_preselector: 'OPCIONES' | 'TEXTO_LIBRE'
      ubicacion: 'REMOTO' | 'HIBRIDO' | 'LOCALIDADES'
      valoracion_competencia: 'SUBESTIMA' | 'JUSTO' | 'SOBRESTIMA'
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database["public"]

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"]
export type Enums<T extends keyof PublicSchema["Enums"]> = PublicSchema["Enums"][T]
