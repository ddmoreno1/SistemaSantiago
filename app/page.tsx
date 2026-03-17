'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Producto = {
  id: number
  nombre_producto: string
  descripcion: string
  precio: number
  cantidad: number
  tipo: string
}

const USUARIO_VALIDO = 'santiago'

const initialForm = {
  nombre_producto: '',
  descripcion: '',
  precio: '',
  cantidad: '',
  tipo: 'Repuesto',
}

export default function Page() {
  const [username, setUsername] = useState('')
  const [isLogged, setIsLogged] = useState(false)
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Producto | null>(null)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [tipoFiltro, setTipoFiltro] = useState('Todos')
  const [stockFiltro, setStockFiltro] = useState('Todos')

  useEffect(() => {
    const saved = localStorage.getItem('inventario_login')
    if (saved === 'ok') {
      setIsLogged(true)
    }
  }, [])

  useEffect(() => {
    if (isLogged) {
      fetchProductos()
    }
  }, [isLogged])

  async function fetchProductos() {
    setLoading(true)

    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      setError('No se pudieron cargar los productos.')
    } else {
      setProductos((data as Producto[]) || [])
    }

    setLoading(false)
  }

  function handleLogin() {
    if (username.trim().toLowerCase() === USUARIO_VALIDO) {
      localStorage.setItem('inventario_login', 'ok')
      setIsLogged(true)
      setError('')
      return
    }

    setError('Usuario incorrecto. Usa Santiago o santiago.')
  }

  function logout() {
    localStorage.removeItem('inventario_login')
    setIsLogged(false)
    setUsername('')
    setError('')
  }

  async function saveProducto() {
    if (!form.nombre_producto.trim()) {
      setError('El nombre del producto es obligatorio.')
      return
    }

    const payload = {
      nombre_producto: form.nombre_producto.trim(),
      descripcion: form.descripcion.trim(),
      precio: Number(form.precio || 0),
      cantidad: Number(form.cantidad || 0),
      tipo: form.tipo,
    }

    setError('')

    if (editingId) {
      const { error } = await supabase
        .from('productos')
        .update(payload)
        .eq('id', editingId)

      if (error) {
        setError('No se pudo editar el producto.')
        return
      }
    } else {
      const { error } = await supabase.from('productos').insert(payload)

      if (error) {
        setError('No se pudo crear el producto.')
        return
      }
    }

    setForm(initialForm)
    setEditingId(null)
    setIsModalOpen(false)
    fetchProductos()
  }

  function editProducto(producto: Producto) {
    setEditingId(producto.id)
    setForm({
      nombre_producto: producto.nombre_producto,
      descripcion: producto.descripcion,
      precio: String(producto.precio),
      cantidad: String(producto.cantidad),
      tipo: producto.tipo || 'Repuesto',
    })
    setError('')
    setIsModalOpen(true)
  }

  async function deleteProducto(id: number) {
    const ok = window.confirm('¿Deseas eliminar este producto?')
    if (!ok) return

    const { error } = await supabase.from('productos').delete().eq('id', id)

    if (error) {
      setError('No se pudo eliminar el producto.')
      return
    }

    if (selected?.id === id) {
      setSelected(null)
    }

    fetchProductos()
  }

  async function changeCantidad(producto: Producto, delta: number) {
    const nuevaCantidad = Math.max(0, producto.cantidad + delta)

    const { error } = await supabase
      .from('productos')
      .update({ cantidad: nuevaCantidad })
      .eq('id', producto.id)

    if (error) {
      setError('No se pudo actualizar la cantidad.')
      return
    }

    if (selected?.id === producto.id) {
      setSelected({ ...producto, cantidad: nuevaCantidad })
    }

    fetchProductos()
  }

  const productosFiltrados = useMemo(() => {
    const termino = searchTerm.toLowerCase().trim()

    return productos.filter((producto) => {
      const coincideBusqueda =
        producto.nombre_producto.toLowerCase().includes(termino) ||
        producto.descripcion.toLowerCase().includes(termino) ||
        (producto.tipo || '').toLowerCase().includes(termino)

      const coincideTipo =
        tipoFiltro === 'Todos' || producto.tipo === tipoFiltro

      const coincideStock =
        stockFiltro === 'Todos' ||
        (stockFiltro === 'Con stock' && producto.cantidad > 0) ||
        (stockFiltro === 'Sin stock' && producto.cantidad === 0) ||
        (stockFiltro === 'Stock bajo' &&
          producto.cantidad > 0 &&
          producto.cantidad <= 3)

      return coincideBusqueda && coincideTipo && coincideStock
    })
  }, [productos, searchTerm, tipoFiltro, stockFiltro])

  const totalProductos = productos.length
  const totalStock = useMemo(
    () => productos.reduce((acc, item) => acc + item.cantidad, 0),
    [productos]
  )

  if (!isLogged) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center text-2xl font-bold">
              ET
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              ElectroTecnik Servicios
            </h1>
            <p className="text-sm text-slate-500 mt-2">Sistema de inventario</p>
          </div>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            Usuario
          </label>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Escribe Santiago"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black placeholder-gray-500 outline-none focus:ring-2 focus:ring-slate-900"
          />

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <button
            onClick={handleLogin}
            className="mt-5 w-full rounded-2xl bg-slate-900 text-white py-3 font-semibold hover:opacity-95"
          >
            Iniciar sesión
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-3xl bg-white shadow-lg p-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img
  src="/Logo.png"
  alt="ElectroTecnik"
  className="h-16 w-16 object-contain"
/>

            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                ElectroTecnik Servicios
              </h1>
              <p className="text-slate-500">
                Inventario de repuestos, insumos y equipos
              </p>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-black placeholder-gray-500">
              <span className="font-semibold">Productos:</span> {totalProductos}
            </div>

            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-black placeholder-gray-500">
              <span className="font-semibold">Stock total:</span> {totalStock}
            </div>

            <button
              onClick={logout}
              className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        <section className="mb-6 rounded-3xl bg-white shadow-lg p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Gestión de inventario
              </h2>
              <p className="text-sm text-slate-500 text-black placeholder-gray-500">
                Busca productos y filtra por tipo o disponibilidad
              </p>
            </div>

            <button
              onClick={() => {
                setEditingId(null)
                setForm(initialForm)
                setError('')
                setIsModalOpen(true)
              }}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-white font-semibold"
            >
              Crear producto
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Buscar por producto, descripción o palabra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black placeholder-gray-500"
            />

            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black placeholder-gray-500"
            >
              <option value="Todos">Todos los tipos</option>
              <option value="Repuesto">Repuesto</option>
              <option value="Insumo">Insumo</option>
              <option value="Equipo">Equipo</option>
            </select>

            <select
              value={stockFiltro}
              onChange={(e) => setStockFiltro(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black placeholder-gray-500"
            >
              <option value="Todos">Todo el stock</option>
              <option value="Con stock">Con stock</option>
              <option value="Sin stock">Sin stock</option>
              <option value="Stock bajo">Stock bajo</option>
            </select>
          </div>
        </section>

        <section className="rounded-3xl bg-white shadow-lg p-4 md:p-6 overflow-hidden">
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-lg md:text-xl font-bold text-slate-900">
      Productos disponibles
    </h2>
    {loading ? (
      <span className="text-sm text-slate-500">Cargando...</span>
    ) : null}
  </div>

  {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

  <div className="hidden md:block overflow-x-auto">
    <table className="min-w-full border-separate border-spacing-y-2">
      <thead>
        <tr className="text-left text-sm text-slate-500">
          <th className="px-3 py-2">ID</th>
          <th className="px-3 py-2">Nombre</th>
          <th className="px-3 py-2">Tipo</th>
          <th className="px-3 py-2">Precio</th>
          <th className="px-3 py-2">Cantidad</th>
          <th className="px-3 py-2">Acciones</th>
        </tr>
      </thead>

      <tbody>
        {productosFiltrados.map((producto) => (
          <tr key={producto.id} className="bg-slate-50">
            <td className="px-3 py-3 rounded-l-2xl">{producto.id}</td>

            <td className="px-3 py-3 font-medium">
              {producto.nombre_producto}
            </td>

            <td className="px-3 py-3">
              <span className="rounded-xl bg-slate-200 px-3 py-1 text-sm font-medium text-slate-700">
                {producto.tipo || 'Sin tipo'}
              </span>
            </td>

            <td className="px-3 py-3">
              ${Number(producto.precio).toFixed(2)}
            </td>

            <td className="px-3 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeCantidad(producto, -1)}
                  className="h-8 w-8 rounded-full bg-slate-200 font-bold"
                >
                  -
                </button>

                <span className="min-w-8 text-center font-semibold">
                  {producto.cantidad}
                </span>

                <button
                  onClick={() => changeCantidad(producto, 1)}
                  className="h-8 w-8 rounded-full bg-slate-900 text-white font-bold"
                >
                  +
                </button>
              </div>
            </td>

            <td className="px-3 py-3 rounded-r-2xl">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelected(producto)}
                  className="rounded-xl bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700"
                >
                  Ver más
                </button>

                <button
                  onClick={() => editProducto(producto)}
                  className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700"
                >
                  Editar
                </button>

                <button
                  onClick={() => deleteProducto(producto.id)}
                  className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700"
                >
                  Eliminar
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>

  <div className="md:hidden space-y-4">
    {productosFiltrados.map((producto) => (
      <div
        key={producto.id}
        className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-slate-500">ID: {producto.id}</p>
            <h3 className="text-base font-bold text-slate-900">
              {producto.nombre_producto}
            </h3>
          </div>

          <span className="rounded-xl bg-slate-200 px-3 py-1 text-xs font-medium text-slate-700">
            {producto.tipo || 'Sin tipo'}
          </span>
        </div>

        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Precio:</span> $
            {Number(producto.precio).toFixed(2)}
          </p>
          <p>
            <span className="font-semibold">Descripción:</span>{' '}
            {producto.descripcion || 'Sin descripción'}
          </p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeCantidad(producto, -1)}
              className="h-9 w-9 rounded-full bg-slate-200 font-bold"
            >
              -
            </button>

            <span className="min-w-8 text-center font-semibold text-slate-900">
              {producto.cantidad}
            </span>

            <button
              onClick={() => changeCantidad(producto, 1)}
              className="h-9 w-9 rounded-full bg-slate-900 text-white font-bold"
            >
              +
            </button>
          </div>

          <span className="text-sm font-medium text-slate-600">
            Stock actual
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <button
            onClick={() => setSelected(producto)}
            className="rounded-xl bg-blue-100 px-2 py-2 text-xs font-medium text-blue-700"
          >
            Ver más
          </button>

          <button
            onClick={() => editProducto(producto)}
            className="rounded-xl bg-amber-100 px-2 py-2 text-xs font-medium text-amber-700"
          >
            Editar
          </button>

          <button
            onClick={() => deleteProducto(producto.id)}
            className="rounded-xl bg-red-100 px-2 py-2 text-xs font-medium text-red-700"
          >
            Eliminar
          </button>
        </div>
      </div>
    ))}
  </div>

  {!loading && productosFiltrados.length === 0 ? (
    <div className="py-10 text-center text-slate-500">
      No se encontraron productos con esos filtros.
    </div>
  ) : null}
</section>

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white shadow-xl p-6 relative">
              <button
                onClick={() => {
                  setIsModalOpen(false)
                  setEditingId(null)
                  setForm(initialForm)
                  setError('')
                }}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-red-500 text-white font-bold"
              >
                X
              </button>

              <h2 className="text-2xl font-bold text-slate-900 mb-5">
                {editingId ? 'Editar producto' : 'Crear producto'}
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  placeholder="Nombre del producto"
                  value={form.nombre_producto}
                  onChange={(e) =>
                    setForm({ ...form, nombre_producto: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black placeholder-gray-500"
                />

                <select
                  value={form.tipo}
                  onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3"
                >
                  <option value="Repuesto">Repuesto</option>
                  <option value="Insumo">Insumo</option>
                  <option value="Equipo">Equipo</option>
                </select>

                <input
                  type="number"
                  step="0.01"
                  placeholder="Precio"
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black placeholder-gray-500"
                />

                <input
                  type="number"
                  placeholder="Cantidad"
                  value={form.cantidad}
                  onChange={(e) =>
                    setForm({ ...form, cantidad: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black placeholder-gray-500"
                />
              </div>

              <textarea
                placeholder="Descripción"
                value={form.descripcion}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
                className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 min-h-32 text-black placeholder-gray-500"
              />

              {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

              <div className="mt-5 flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                    setEditingId(null)
                    setForm(initialForm)
                    setError('')
                  }}
                  className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700"
                >
                  Cancelar
                </button>

                <button
                  onClick={saveProducto}
                  className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white"
                >
                  {editingId ? 'Guardar cambios' : 'Crear producto'}
                </button>
              </div>
            </div>
          </div>
        )}

        {selected && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl shadow-xl p-6 w-[90%] max-w-lg relative">
              <button
                onClick={() => setSelected(null)}
                className="absolute top-3 right-3 bg-red-500 text-white w-8 h-8 rounded-full"
              >
                X
              </button>

              <h3 className="text-xl font-bold text-slate-900 mb-4 text-black placeholder-gray-500">
                Información completa del producto
              </h3>

              <div className="space-y-2 text-sm md:text-base">
                <p>
                  <span className="font-semibold">ID:</span> {selected.id}
                </p>

                <p>
                  <span className="font-semibold">Nombre:</span>{' '}
                  {selected.nombre_producto}
                </p>

                <p>
                  <span className="font-semibold">Tipo:</span> {selected.tipo}
                </p>

                <p>
                  <span className="font-semibold">Precio:</span> $
                  {Number(selected.precio).toFixed(2)}
                </p>

                <p>
                  <span className="font-semibold">Cantidad:</span>{' '}
                  {selected.cantidad}
                </p>

                <p>
                  <span className="font-semibold">Descripción:</span>
                  <br />
                  {selected.descripcion}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}