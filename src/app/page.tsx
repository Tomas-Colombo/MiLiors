"use client";

import { useState } from "react";
import {
  Button,
  IconButton,
  Input,
  Field,
  Select,
  Checkbox,
  Radio,
  Switch,
  Badge,
  Chip,
  CountBadge,
  Card,
  KpiCard,
  PromoCard,
  Avatar,
  Alert,
  Toast,
  ProgressBar,
  ProgressRing,
  Skeleton,
  EmptyState,
  Tooltip,
  Modal,
  Table,
  Pagination,
  NavItem,
  Tabs,
  type Column,
} from "@/components/ui";
import {
  HomeIcon,
  UsersIcon,
  BuildingIcon,
  GridIcon,
  BarChartIcon,
  SearchIcon,
  PlusIcon,
  BellIcon,
  ChevronDownIcon,
  ArrowRightIcon,
  TrashIcon,
  SparklesIcon,
  FileIcon,
  ShieldIcon,
  ImageIcon,
  MoreHorizontalIcon,
  UserPlusIcon,
} from "@/components/icons";

type Empresa = {
  id: string;
  nombre: string;
  iniciales: string;
  color: string;
  responsable: string;
  email: string;
  sector: string;
  fecha: string;
  estado: { tone: "success" | "warning" | "error"; label: string };
};

const empresas: Empresa[] = [
  {
    id: "1",
    nombre: "TechNova Solutions",
    iniciales: "TN",
    color: "#3B2E8F",
    responsable: "María Fernanda López",
    email: "maria.lopez@technova.com",
    sector: "Tecnología",
    fecha: "12 may 2024",
    estado: { tone: "success", label: "Activa" },
  },
  {
    id: "2",
    nombre: "Alimenta SA",
    iniciales: "AL",
    color: "#2BB673",
    responsable: "Jorge Subirats",
    email: "jsubirats@alimenta.com",
    sector: "Alimentos",
    fecha: "5 may 2024",
    estado: { tone: "success", label: "Activa" },
  },
  {
    id: "3",
    nombre: "Grupo Soluciones TI",
    iniciales: "GS",
    color: "#3B82F6",
    responsable: "Carlos Ramírez",
    email: "cramirez@gruposolti.com",
    sector: "Tecnología",
    fecha: "30 abr 2024",
    estado: { tone: "warning", label: "Pendiente" },
  },
];

const columns: Column<Empresa>[] = [
  {
    key: "empresa",
    header: "Empresa",
    width: "1.6fr",
    cell: (r) => (
      <div className="flex items-center gap-[11px]">
        <Avatar initials={r.iniciales} color={r.color} size="sm" className="rounded-[9px] [&>span]:rounded-[9px]" />
        <span className="text-[13.5px] font-semibold text-ink">{r.nombre}</span>
      </div>
    ),
  },
  {
    key: "responsable",
    header: "Responsable",
    width: "1.8fr",
    cell: (r) => (
      <div>
        <div className="text-[13.5px] text-ink">{r.responsable}</div>
        <div className="text-xs text-neutral-400">{r.email}</div>
      </div>
    ),
  },
  { key: "sector", header: "Sector", width: "1fr", cell: (r) => r.sector },
  { key: "fecha", header: "Fecha de alta", width: "1.1fr", cell: (r) => r.fecha },
  {
    key: "estado",
    header: "Estado",
    width: "1fr",
    cell: (r) => (
      <Badge tone={r.estado.tone} dot>
        {r.estado.label}
      </Badge>
    ),
  },
  {
    key: "acciones",
    header: "Acciones",
    width: "0.6fr",
    align: "right",
    cell: () => (
      <span className="inline-flex justify-end text-neutral-400">
        <MoreHorizontalIcon size={18} />
      </span>
    ),
  },
];

function SectionTitle({ overline, title, children }: { overline: string; title: string; children?: string }) {
  return (
    <div className="mb-7">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.06em] text-primary-600">{overline}</div>
      <h2 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">{title}</h2>
      {children && <p className="m-0 mt-2 max-w-[600px] text-[15px] leading-[1.6] text-muted">{children}</p>}
    </div>
  );
}

export default function Home() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState("informe");
  const [page, setPage] = useState(1);

  return (
    <div className="mx-auto flex max-w-[var(--app-content-max)] items-start">
      {/* ============ SIDEBAR ============ */}
      <aside className="sticky top-0 hidden h-screen w-[260px] flex-none border-r border-neutral-200 bg-surface p-5 lg:block">
        <div className="mb-7 flex items-center gap-[11px]">
          <div
            className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] shadow-primary"
            style={{ background: "var(--gradient-brand-soft)" }}
          >
            <SparklesIcon size={20} className="text-white" />
          </div>
          <div>
            <div className="text-[17px] font-extrabold tracking-[-0.02em]">TalentID</div>
            <div className="text-[10.5px] font-medium text-neutral-400">Plataforma SaaS</div>
          </div>
        </div>
        <nav className="flex flex-col gap-0.5">
          <NavItem icon={<HomeIcon size={18} />} label="Dashboard" active />
          <NavItem icon={<UsersIcon size={18} />} label="Postulantes" />
          <NavItem icon={<BuildingIcon size={18} />} label="Empresas" trailing={<CountBadge>3</CountBadge>} />
          <NavItem icon={<GridIcon size={18} />} label="Sectores" />
          <NavItem icon={<BarChartIcon size={18} />} label="Informes" />
        </nav>
      </aside>

      {/* ============ MAIN ============ */}
      <main className="min-w-0 flex-1 px-6 py-10 md:px-12">
        {/* Topbar */}
        <div className="mb-9 flex items-center justify-between gap-4">
          <div>
            <div className="text-base font-bold">¡Hola, Janet! 👋</div>
            <div className="text-[12.5px] text-neutral-400">Gestiona tu plataforma desde un solo lugar.</div>
          </div>
          <div className="flex items-center gap-[18px]">
            <div className="relative">
              <BellIcon size={20} className="text-muted" />
              <span className="absolute -right-1.5 -top-1.5">
                <CountBadge>3</CountBadge>
              </span>
            </div>
            <div className="flex items-center gap-[9px]">
              <Avatar size="sm" />
              <span className="text-[13.5px] font-semibold">Janet Rodríguez</span>
              <ChevronDownIcon size={15} className="text-neutral-400" />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <section className="mb-12">
          <SectionTitle overline="Resumen" title="Indicadores">
            Cards de KPI con ícono tonal, valor y tendencia, listas desde el design system.
          </SectionTitle>
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              icon={<UsersIcon size={22} />}
              tone="violet"
              label="Empresas registradas"
              value="1.248"
              trend={{ value: "8,7%", direction: "up", caption: "vs. anterior" }}
            />
            <KpiCard
              icon={<BuildingIcon size={22} />}
              tone="green"
              label="Empresas activas"
              value="842"
              trend={{ value: "6,2%", direction: "up", caption: "vs. anterior" }}
            />
            <KpiCard
              icon={<UserPlusIcon size={22} />}
              tone="amber"
              label="Nuevas esta semana"
              value="34"
              trend={{ value: "21,4%", direction: "up", caption: "vs. anterior" }}
            />
            <KpiCard
              icon={<FileIcon size={22} />}
              tone="blue"
              label="Con actividad reciente"
              value="612"
              trend={{ value: "9,3%", direction: "up", caption: "vs. anterior" }}
            />
          </div>
        </section>

        {/* Botones + perfil + promo */}
        <section className="mb-12">
          <SectionTitle overline="Componentes" title="Acciones y cards" />
          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.4fr_1fr]">
            <Card padding="lg">
              <div className="mb-4 flex flex-wrap items-center gap-3.5">
                <Button leftIcon={<PlusIcon size={16} strokeWidth={2.5} />}>Primario</Button>
                <Button variant="secondary">Secundario</Button>
                <Button variant="tonal">Tonal</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructivo</Button>
                <IconButton aria-label="Más opciones">
                  <MoreHorizontalIcon size={18} />
                </IconButton>
              </div>
              <div className="flex flex-wrap items-center gap-3.5">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
                <Button loading>Cargando</Button>
                <Button disabled>Disabled</Button>
              </div>
            </Card>
            <PromoCard
              icon={<SparklesIcon size={17} className="text-[#ffd66b]" />}
              title="Potencia tu plataforma"
              action={
                <Button
                  variant="secondary"
                  className="border-white/25 bg-white/[0.16] text-white hover:bg-white/[0.26] hover:border-white/25"
                  rightIcon={<ArrowRightIcon size={14} />}
                >
                  Explorar funciones
                </Button>
              }
            >
              Obtén insights, automatiza procesos y mejora la calidad de tus datos.
            </PromoCard>
          </div>
        </section>

        {/* Formulario */}
        <section className="mb-12">
          <SectionTitle overline="Componentes" title="Formularios" />
          <Card padding="lg">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label="Nombre de la empresa" required>
                <Input defaultValue="TechNova Solutions" />
              </Field>
              <Field label="Responsable" required>
                <Input defaultValue="María Fernanda López" />
              </Field>
              <Field label="Sector">
                <Select
                  placeholder="Seleccionar sector"
                  options={[
                    { value: "tec", label: "Tecnología e Información" },
                    { value: "ali", label: "Alimentos y Bebidas" },
                    { value: "sal", label: "Salud y Farmacéutica" },
                  ]}
                  defaultValue="tec"
                />
              </Field>
              <Field label="Correo de contacto" error="Falta el dominio del correo.">
                <Input defaultValue="contacto@technova" status="error" />
              </Field>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-7 border-t border-neutral-100 pt-5">
              <Checkbox label="Acepto los términos" defaultChecked />
              <Radio name="plan" label="Plan Pro" defaultChecked />
              <Radio name="plan" label="Plan Free" />
              <Switch label="Notificaciones" defaultChecked />
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <Button variant="secondary">Cancelar</Button>
              <Button>Registrar empresa</Button>
            </div>
          </Card>
        </section>

        {/* Badges, chips, búsqueda */}
        <section className="mb-12">
          <SectionTitle overline="Componentes" title="Badges, chips & búsqueda" />
          <Card padding="lg">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              <Badge tone="success" dot>
                Activa
              </Badge>
              <Badge tone="warning" dot>
                Pendiente
              </Badge>
              <Badge tone="error" dot>
                Inactiva
              </Badge>
              <Badge tone="info" dot>
                En evaluación
              </Badge>
              <Badge tone="primary">Nuevo</Badge>
              <Badge>Borrador</Badge>
            </div>
            <div className="mb-5 flex flex-wrap items-center gap-2.5">
              <Chip>Atención al cliente</Chip>
              <Chip>Comunicación</Chip>
              <Chip selected onRemove={() => {}}>
                Empatía
              </Chip>
              <Badge>+2</Badge>
            </div>
            <Input
              leftIcon={<SearchIcon size={17} />}
              placeholder="Buscar empresa, responsable o actividad…"
            />
          </Card>
        </section>

        {/* Tabla */}
        <section className="mb-12">
          <SectionTitle overline="Componentes" title="Tablas" />
          <Table
            columns={columns}
            rows={empresas}
            rowKey={(r) => r.id}
            highlightKey="1"
            footer={
              <>
                <span className="text-[12.5px] text-neutral-400">Mostrando 1–3 de 1.248 empresas</span>
                <Pagination page={page} pageCount={3} onPageChange={setPage} />
              </>
            }
          />
        </section>

        {/* Feedback */}
        <section className="mb-12">
          <SectionTitle overline="Componentes" title="Feedback" />
          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
            <Card padding="lg" className="flex flex-col gap-3">
              <Alert tone="success" title="Empresa registrada correctamente">
                TechNova Solutions ya aparece en el listado.
              </Alert>
              <Alert tone="warning" title="Hay datos sin completar">
                Faltan 3 campos obligatorios antes de publicar.
              </Alert>
              <Alert tone="error" title="No se pudo guardar">
                Revisa tu conexión e inténtalo de nuevo.
              </Alert>
              <Alert tone="info" title="La IA puede cometer errores">
                Revisa siempre la información antes de decidir.
              </Alert>
            </Card>
            <Card padding="lg" className="flex flex-col gap-6">
              <Toast title="Cambios guardados" description="Tu configuración de privacidad se actualizó." onClose={() => {}} />
              <ProgressBar value={78} label="Perfil completado" />
              <div className="flex items-center gap-3.5">
                <ProgressRing value={78} />
                <span className="text-[13px] text-muted">Anillo de progreso · KPI</span>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-[11px] w-3/5" />
                  <Skeleton className="h-[11px] w-[85%]" />
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Tabs + estado vacío + modal */}
        <section className="mb-4">
          <SectionTitle overline="Componentes" title="Navegación & overlays" />
          <Card padding="lg" className="mb-[18px]">
            <Tabs
              value={tab}
              onChange={setTab}
              items={[
                { id: "informe", label: "Informe IA", icon: <FileIcon size={16} /> },
                { id: "privacidad", label: "Privacidad", icon: <ShieldIcon size={16} /> },
                { id: "certificado", label: "Certificado", icon: <ImageIcon size={16} /> },
              ]}
            />
          </Card>
          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-2">
            <Card padding="lg">
              <EmptyState
                icon={<SearchIcon size={26} />}
                title="Sin resultados"
                description="No encontramos empresas con esos filtros. Prueba con otros términos."
                action={
                  <Button variant="tonal" size="sm">
                    Limpiar filtros
                  </Button>
                }
              />
            </Card>
            <Card padding="lg" className="flex flex-col items-start justify-center gap-4">
              <Tooltip content="Perfil verificado por TalentID">
                <Button variant="secondary">Pasa el cursor aquí</Button>
              </Tooltip>
              <Button variant="destructive" leftIcon={<TrashIcon size={16} />} onClick={() => setModalOpen(true)}>
                Abrir modal de eliminación
              </Button>
            </Card>
          </div>
        </section>

        <div className="mt-12 text-center text-[12.5px] text-neutral-400">
          TalentID Design System · v1.0 · Fuente de verdad visual para React / Next.js
        </div>
      </main>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        icon={
          <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[12px] bg-error-bg text-error">
            <TrashIcon size={22} />
          </div>
        }
        title="Eliminar empresa"
        footer={
          <>
            <Button variant="secondary" className="flex-1" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" className="flex-1" onClick={() => setModalOpen(false)}>
              Sí, eliminar
            </Button>
          </>
        }
      >
        ¿Seguro que deseas eliminar <strong className="text-ink">TechNova Solutions</strong>? Esta acción no se puede
        deshacer y se perderán sus 12 vacantes asociadas.
      </Modal>
    </div>
  );
}
