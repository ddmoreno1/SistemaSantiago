'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Producto = {
  id: number
  nombre_producto: string
  descripcion: string
  precio: number
  precio_compra: number
  cantidad: number
  tipo: string
}

type CotizacionItem = {
  id: number
  nombre: string
  descripcion: string
  precio: number
  cantidad: number
  subtotal: number
}

const USUARIO_VALIDO = 'santiago'

const initialForm = {
  nombre_producto: '',
  descripcion: '',
  precio: '',
  precio_compra: '',
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
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [productoPendiente, setProductoPendiente] = useState<Producto | null>(
    null
  )
  const [deltaPendiente, setDeltaPendiente] = useState(0)

  const [vista, setVista] = useState<'inventario' | 'cotizacion'>('inventario')

  const [cotizacionItems, setCotizacionItems] = useState<CotizacionItem[]>([])
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null)
  const [cantidadCot, setCantidadCot] = useState(1)
  const [busquedaProductoCot, setBusquedaProductoCot] = useState('')

  const [cliente, setCliente] = useState('')
  const [ruc, setRuc] = useState('')
  const [direccion, setDireccion] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [metodoPago, setMetodoPago] = useState('EFECTIVO')
  const [otroMetodo, setOtroMetodo] = useState('')
  const [notaImportante, setNotaImportante] = useState(
    'La entrega del equipo será en 72 horas.'
  )
  const [fechaCotizacion, setFechaCotizacion] = useState(
    new Date().toISOString().slice(0, 10)
  )

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
      precio_compra: Number(form.precio_compra || 0),
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
      precio_compra: String(producto.precio_compra ?? 0),
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

  function changeCantidad(producto: Producto, delta: number) {
    setProductoPendiente(producto)
    setDeltaPendiente(delta)
    setConfirmModalOpen(true)
  }

  async function confirmarCambioCantidad() {
    if (!productoPendiente) return

    const nuevaCantidad = Math.max(0, productoPendiente.cantidad + deltaPendiente)

    const { error } = await supabase
      .from('productos')
      .update({ cantidad: nuevaCantidad })
      .eq('id', productoPendiente.id)

    if (error) {
      setError('No se pudo actualizar la cantidad.')
      return
    }

    if (selected?.id === productoPendiente.id) {
      setSelected({ ...productoPendiente, cantidad: nuevaCantidad })
    }

    setConfirmModalOpen(false)
    setProductoPendiente(null)
    setDeltaPendiente(0)
    fetchProductos()
  }

  function cerrarConfirmModal() {
    setConfirmModalOpen(false)
    setProductoPendiente(null)
    setDeltaPendiente(0)
  }

  function agregarProductoCotizacion() {
    if (!productoSeleccionado || cantidadCot <= 0) return

    const producto = productos.find((p) => p.id === productoSeleccionado.id)
    if (!producto) return

    const existe = cotizacionItems.find((item) => item.id === producto.id)

    if (existe) {
      const actualizados = cotizacionItems.map((item) =>
        item.id === producto.id
          ? {
              ...item,
              cantidad: item.cantidad + cantidadCot,
              subtotal: (item.cantidad + cantidadCot) * item.precio,
            }
          : item
      )
      setCotizacionItems(actualizados)
    } else {
      const nuevoItem: CotizacionItem = {
        id: producto.id,
        nombre: producto.nombre_producto,
        descripcion: producto.descripcion || '',
        precio: Number(producto.precio || 0),
        cantidad: cantidadCot,
        subtotal: Number(producto.precio || 0) * cantidadCot,
      }
      setCotizacionItems([...cotizacionItems, nuevoItem])
    }

    setProductoSeleccionado(null)
    setCantidadCot(1)
    setBusquedaProductoCot('')
  }

  function eliminarItemCotizacion(index: number) {
    const nuevos = [...cotizacionItems]
    nuevos.splice(index, 1)
    setCotizacionItems(nuevos)
  }

  function cambiarCantidadItem(index: number, nuevaCantidad: number) {
    const cantidadValida = Math.max(1, nuevaCantidad)
    const nuevos = [...cotizacionItems]
    nuevos[index] = {
      ...nuevos[index],
      cantidad: cantidadValida,
      subtotal: cantidadValida * nuevos[index].precio,
    }
    setCotizacionItems(nuevos)
  }

  function cambiarPrecioItem(index: number, nuevoPrecio: number) {
    const precioValido = Math.max(0, nuevoPrecio)
    const nuevos = [...cotizacionItems]
    nuevos[index] = {
      ...nuevos[index],
      precio: precioValido,
      subtotal: precioValido * nuevos[index].cantidad,
    }
    setCotizacionItems(nuevos)
  }

  function limpiarCotizacion() {
    setCotizacionItems([])
    setProductoSeleccionado(null)
    setCantidadCot(1)
    setBusquedaProductoCot('')
    setCliente('')
    setRuc('')
    setDireccion('')
    setTelefono('')
    setEmail('')
    setMetodoPago('EFECTIVO')
    setOtroMetodo('')
    setNotaImportante('La entrega del equipo será en 72 horas.')
    setFechaCotizacion(new Date().toISOString().slice(0, 10))
  }

  function guardarPDF() {
    window.print()
  }

  const productosFiltrados = useMemo(() => {
    const termino = searchTerm.toLowerCase().trim()

    return productos.filter((producto) => {
      const coincideBusqueda =
        producto.nombre_producto.toLowerCase().includes(termino) ||
        producto.descripcion.toLowerCase().includes(termino) ||
        (producto.tipo || '').toLowerCase().includes(termino)

      const coincideTipo = tipoFiltro === 'Todos' || producto.tipo === tipoFiltro

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

  const productosBusquedaCotizacion = useMemo(() => {
    const termino = busquedaProductoCot.toLowerCase().trim()

    return productos
      .filter((producto) => producto.cantidad > 0)
      .filter((producto) => {
        if (!termino) return true
        return (
          producto.nombre_producto.toLowerCase().includes(termino) ||
          producto.descripcion.toLowerCase().includes(termino) ||
          (producto.tipo || '').toLowerCase().includes(termino)
        )
      })
      .slice(0, 12)
  }, [productos, busquedaProductoCot])

  const totalProductos = productos.length
  const totalStock = useMemo(
    () => productos.reduce((acc, item) => acc + item.cantidad, 0),
    [productos]
  )

  const subtotalCotizacion = cotizacionItems.reduce(
    (acc, item) => acc + item.subtotal,
    0
  )
  const ivaCotizacion = subtotalCotizacion * 0.15
  const totalCotizacion = subtotalCotizacion + ivaCotizacion

  if (!isLogged) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-white shadow-xl p-8">
          <div className="text-center mb-6 flex justify-center">
            <img
              src="/Logo1.png"
              alt="Logo"
              className="h-20 md:h-24 lg:h-28 w-auto object-contain"
            />
          </div>

          <label className="block text-sm font-medium text-slate-700 mb-2">
            Usuario
          </label>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Contraseña"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black placeholder-gray-500 outline-none focus:ring-2 focus:ring-slate-900"
          />

          {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

          <button
            onClick={handleLogin}
            className="mt-5 w-full rounded-2xl bg-slate-900 text-white py-3 font-semibold hover:opacity-95 cursor-pointer"
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
        <header className="print:hidden mb-6 rounded-3xl bg-white shadow-lg px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center h-full">
            <img
              src="/Logo1.png"
              alt="Logo"
              className="h-16 md:h-20 lg:h-24 w-auto object-contain"
            />
          </div>

          <div className="flex justify-center items-center md:flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-wider text-center">
              BIENVENIDO SANTIAGO
            </h1>
          </div>

          <div className="flex gap-3 flex-wrap">
            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-black">
              <span className="font-semibold">Productos:</span> {totalProductos}
            </div>

            <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm text-black">
              <span className="font-semibold">Stock total:</span> {totalStock}
            </div>

            <button
              onClick={() => setVista('inventario')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white cursor-pointer ${
                vista === 'inventario' ? 'bg-slate-900' : 'bg-slate-600'
              }`}
            >
              Inventario
            </button>

            <button
              onClick={() => setVista('cotizacion')}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold text-white cursor-pointer ${
                vista === 'cotizacion' ? 'bg-green-600' : 'bg-green-500'
              }`}
            >
              Cotización
            </button>

            <button
              onClick={logout}
              className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white cursor-pointer"
            >
              Cerrar sesión
            </button>
          </div>
        </header>

        {vista === 'inventario' && (
          <>
            <section className="mb-6 rounded-3xl bg-white shadow-lg p-6">
              <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Gestión de inventario
                  </h2>
                  <p className="text-sm text-slate-500">
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
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-white font-semibold cursor-pointer"
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
                >
                  <option value="Todos">Todos los tipos</option>
                  <option value="Repuesto">Repuesto</option>
                  <option value="Insumo">Insumo</option>
                  <option value="Equipo">Equipo</option>
                </select>

                <select
                  value={stockFiltro}
                  onChange={(e) => setStockFiltro(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
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
                      <th className="px-3 py-2">Precio venta</th>
                      <th className="px-3 py-2">Precio compra</th>
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
                          ${Number(producto.precio_compra ?? 0).toFixed(2)}
                        </td>

                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => changeCantidad(producto, -1)}
                              className="h-8 w-8 rounded-full bg-slate-200 font-bold cursor-pointer"
                            >
                              -
                            </button>

                            <span className="min-w-8 text-center font-semibold">
                              {producto.cantidad}
                            </span>

                            <button
                              onClick={() => changeCantidad(producto, 1)}
                              className="h-8 w-8 rounded-full bg-slate-900 text-white font-bold cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </td>

                        <td className="px-3 py-3 rounded-r-2xl">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => setSelected(producto)}
                              className="rounded-xl bg-blue-100 px-3 py-2 text-sm font-medium text-blue-700 cursor-pointer"
                            >
                              Ver más
                            </button>

                            <button
                              onClick={() => editProducto(producto)}
                              className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700 cursor-pointer"
                            >
                              Editar
                            </button>

                            <button
                              onClick={() => deleteProducto(producto.id)}
                              className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700 cursor-pointer"
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
                        <span className="font-semibold">Precio venta:</span> $
                        {Number(producto.precio).toFixed(2)}
                      </p>
                      <p>
                        <span className="font-semibold">Precio compra:</span> $
                        {Number(producto.precio_compra ?? 0).toFixed(2)}
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
                          className="h-9 w-9 rounded-full bg-slate-200 font-bold cursor-pointer"
                        >
                          -
                        </button>

                        <span className="min-w-8 text-center font-semibold text-slate-900">
                          {producto.cantidad}
                        </span>

                        <button
                          onClick={() => changeCantidad(producto, 1)}
                          className="h-9 w-9 rounded-full bg-slate-900 text-white font-bold cursor-pointer"
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
                        className="rounded-xl bg-blue-100 px-2 py-2 text-xs font-medium cursor-pointer text-blue-700"
                      >
                        Ver más
                      </button>

                      <button
                        onClick={() => editProducto(producto)}
                        className="rounded-xl bg-amber-100 px-2 py-2 text-xs font-medium text-amber-700 cursor-pointer"
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => deleteProducto(producto.id)}
                        className="rounded-xl bg-red-100 px-2 py-2 text-xs font-medium text-red-700 cursor-pointer"
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
          </>
        )}

        {vista === 'cotizacion' && (
          <section className="space-y-6">
            <div className="rounded-3xl bg-white shadow-lg p-6 print:hidden">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">
                    Nueva cotización
                  </h2>
                  <p className="text-sm text-slate-500">
                    Busca el producto escribiendo, agrégalo y genera el PDF en formato A4.
                  </p>
                </div>

                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={limpiarCotizacion}
                    className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 cursor-pointer"
                  >
                    Limpiar
                  </button>

                  <button
                    onClick={guardarPDF}
                    className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white cursor-pointer"
                  >
                    Guardar PDF
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                <input
                  placeholder="Cliente"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
                />

                <input
                  placeholder="RUC"
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
                />

                <input
                  type="date"
                  value={fechaCotizacion}
                  onChange={(e) => setFechaCotizacion(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
                />

                <input
                  placeholder="Dirección"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
                />

                <input
                  placeholder="Teléfono / Celular"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
                />

                <input
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
                />
              </div>

              <div className="mt-6 rounded-3xl bg-slate-50 p-4 md:p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-4">
                  Agregar productos
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-[1.6fr_120px_auto] gap-3">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Escribe para buscar producto..."
                      value={busquedaProductoCot}
                      onChange={(e) => {
                        setBusquedaProductoCot(e.target.value)
                        setProductoSeleccionado(null)
                      }}
                      className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
                    />

                    {busquedaProductoCot.trim() && (
                      <div className="absolute z-20 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl">
                        {productosBusquedaCotizacion.length > 0 ? (
                          productosBusquedaCotizacion.map((producto) => (
                            <button
                              key={producto.id}
                              type="button"
                              onClick={() => {
                                setProductoSeleccionado(producto)
                                setBusquedaProductoCot(producto.nombre_producto)
                              }}
                              className="w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                            >
                              <div className="font-semibold text-slate-900">
                                {producto.nombre_producto}
                              </div>
                              <div className="text-sm text-slate-500">
                                ${Number(producto.precio).toFixed(2)} | Stock: {producto.cantidad} | {producto.tipo || 'Sin tipo'}
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="px-4 py-3 text-sm text-slate-500">
                            No se encontraron productos.
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <input
                    type="number"
                    min="1"
                    value={cantidadCot}
                    onChange={(e) => setCantidadCot(Number(e.target.value) || 1)}
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
                  />

                  <button
                    onClick={agregarProductoCotizacion}
                    className="rounded-2xl bg-green-600 px-5 py-3 font-semibold text-white cursor-pointer"
                  >
                    Agregar
                  </button>
                </div>

                {productoSeleccionado ? (
                  <div className="mt-4 rounded-2xl bg-white border border-slate-200 px-4 py-3 text-sm">
                    <span className="font-semibold text-slate-900">Seleccionado:</span>{' '}
                    {productoSeleccionado.nombre_producto} — $
                    {Number(productoSeleccionado.precio).toFixed(2)}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl bg-white shadow-lg p-4 md:p-6 overflow-hidden print:hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-slate-900">
                  Ítems de la cotización
                </h3>
                <span className="text-sm text-slate-500">
                  {cotizacionItems.length} producto(s)
                </span>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-full border-separate border-spacing-y-2">
                  <thead>
                    <tr className="text-left text-sm text-slate-500">
                      <th className="px-3 py-2">Cant.</th>
                      <th className="px-3 py-2">Descripción</th>
                      <th className="px-3 py-2">Precio unit.</th>
                      <th className="px-3 py-2">Subtotal</th>
                      <th className="px-3 py-2">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cotizacionItems.map((item, index) => (
                      <tr key={`${item.id}-${index}`} className="bg-slate-50">
                        <td className="px-3 py-3 rounded-l-2xl">
                          <input
                            type="number"
                            min="1"
                            value={item.cantidad}
                            onChange={(e) =>
                              cambiarCantidadItem(index, Number(e.target.value))
                            }
                            className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-black"
                          />
                        </td>

                        <td className="px-3 py-3 font-medium">
                          <div className="text-slate-900">{item.nombre}</div>
                          <div className="text-xs text-slate-500">
                            {item.descripcion || 'Sin descripción'}
                          </div>
                        </td>

                        <td className="px-3 py-3">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.precio}
                            onChange={(e) =>
                              cambiarPrecioItem(index, Number(e.target.value))
                            }
                            className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-black"
                          />
                        </td>

                        <td className="px-3 py-3 font-semibold text-slate-900">
                          ${item.subtotal.toFixed(2)}
                        </td>

                        <td className="px-3 py-3 rounded-r-2xl">
                          <button
                            onClick={() => eliminarItemCotizacion(index)}
                            className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700 cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-4">
                {cotizacionItems.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                  >
                    <h4 className="text-base font-bold text-slate-900">
                      {item.nombre}
                    </h4>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.descripcion || 'Sin descripción'}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) =>
                          cambiarCantidadItem(index, Number(e.target.value))
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-black"
                      />

                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.precio}
                        onChange={(e) =>
                          cambiarPrecioItem(index, Number(e.target.value))
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-black"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        Subtotal: ${item.subtotal.toFixed(2)}
                      </span>

                      <button
                        onClick={() => eliminarItemCotizacion(index)}
                        className="rounded-xl bg-red-100 px-3 py-2 text-sm font-medium text-red-700 cursor-pointer"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {cotizacionItems.length === 0 ? (
                <div className="py-10 text-center text-slate-500">
                  Aún no has agregado productos a la cotización.
                </div>
              ) : null}
            </div>

            <div className="flex justify-end print:hidden">
              <button
                onClick={guardarPDF}
                className="rounded-2xl bg-slate-900 px-6 py-3 font-semibold text-white cursor-pointer"
              >
                Guardar PDF
              </button>
            </div>

            <div className="flex justify-center">
              <div
                id="proforma-a4"
                className="w-full max-w-[794px] bg-white text-[13px] text-slate-900 shadow-lg print:shadow-none"
              >
                <div className="border border-slate-300">
                  <div className="p-5 border-b border-slate-300">
                    <div className="flex items-start justify-between gap-4">
                       <div>
      <img
        src="/Logo1.png"
        alt="Logo"
        className="h-16 w-auto object-contain"
      />
    </div>

    {/* DERECHA → TEXTO */}
    <div className="text-right">
      <p className="text-sm font-bold">ELECTROTECNIK SERVICIOS</p>
      <p className="text-xs">TNLGO: SANTIAGO SANDOVAL</p>
    </div>

          
                    </div>
                  </div>

                  <div className="bg-blue-600 px-4 py-2 text-center text-white font-bold">
                    COTIZACIÓN DIRIGIDO A:
                  </div>

                  <div className="grid grid-cols-2 border-b border-slate-300">
                    <div className="border-r border-slate-300">
                      <div className="grid grid-cols-[120px_1fr] border-b border-slate-300">
                        <div className="bg-slate-100 px-3 py-2 font-bold">CLIENTE:</div>
                        <div className="px-3 py-2">{cliente || '—'}</div>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] border-b border-slate-300">
                        <div className="bg-slate-100 px-3 py-2 font-bold">RUC:</div>
                        <div className="px-3 py-2">{ruc || '—'}</div>
                      </div>
                      <div className="grid grid-cols-[120px_1fr]">
                        <div className="bg-slate-100 px-3 py-2 font-bold">DIRECCIÓN:</div>
                        <div className="px-3 py-2">{direccion || '—'}</div>
                      </div>
                    </div>

                    <div>
                      <div className="grid grid-cols-[120px_1fr] border-b border-slate-300">
                        <div className="bg-slate-100 px-3 py-2 font-bold">FECHA:</div>
                        <div className="px-3 py-2">{fechaCotizacion || '—'}</div>
                      </div>
                      <div className="grid grid-cols-[120px_1fr] border-b border-slate-300">
                        <div className="bg-slate-100 px-3 py-2 font-bold">TELF./CEL:</div>
                        <div className="px-3 py-2">{telefono || '—'}</div>
                      </div>
                      <div className="grid grid-cols-[120px_1fr]">
                        <div className="bg-slate-100 px-3 py-2 font-bold">EMAIL:</div>
                        <div className="px-3 py-2">{email || '—'}</div>
                      </div>
                    </div>
                  </div>

                  <table className="w-full table-fixed border-collapse">
                    <thead>
                      <tr>
                        <th className="w-[70px] border border-slate-300 bg-green-400 px-2 py-2 text-left font-bold">
                          CANT
                        </th>
                        <th className="border border-slate-300 bg-blue-600 px-2 py-2 text-left font-bold text-white">
                          DESCRIPCIÓN
                        </th>
                        <th className="w-[130px] border border-slate-300 bg-green-300 px-2 py-2 text-left font-bold">
                          COSTO UNIT
                        </th>
                        <th className="w-[130px] border border-slate-300 bg-sky-400 px-2 py-2 text-left font-bold">
                          SUBTOTAL
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cotizacionItems.length > 0 ? (
                        cotizacionItems.map((item, index) => (
                          <tr key={`${item.id}-preview-${index}`}>
                            <td className="border border-slate-300 px-2 py-2 align-top">
                              {item.cantidad}
                            </td>
                            <td className="border border-slate-300 px-2 py-2 align-top break-words">
                              <div className="font-semibold">{item.nombre}</div>
                              {item.descripcion ? (
                                <div className="text-[11px] text-slate-600 mt-1">
                                  {item.descripcion}
                                </div>
                              ) : null}
                            </td>
                            <td className="border border-slate-300 px-2 py-2 align-top">
                              ${item.precio.toFixed(2)}
                            </td>
                            <td className="border border-slate-300 px-2 py-2 align-top">
                              ${item.subtotal.toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="border border-slate-300 px-4 py-8 text-center text-slate-500"
                          >
                            Sin productos agregados
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="grid grid-cols-[1fr_280px]">
                    <div className="border-r border-slate-300 p-4">
                      <p className="font-bold">Nota Importante:</p>
                      <p className="mt-1">{notaImportante || '—'}</p>
                    </div>

                    <div>
                      <div className="grid grid-cols-2 border-b border-slate-300">
                        <div className="bg-slate-100 px-3 py-2 font-bold">SUBTOTAL:</div>
                        <div className="px-3 py-2 font-bold">
                          ${subtotalCotizacion.toFixed(2)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 border-b border-slate-300">
                        <div className="bg-slate-100 px-3 py-2 font-bold">IVA 15%:</div>
                        <div className="px-3 py-2 font-bold">
                          ${ivaCotizacion.toFixed(2)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2">
                        <div className="bg-slate-100 px-3 py-2 font-bold text-red-600">
                          TOTAL A PAGAR
                        </div>
                        <div className="px-3 py-2 font-bold">
                          ${totalCotizacion.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border-t border-slate-300">
                    <div className="grid grid-cols-[190px_1fr] border border-slate-300">
                      <div className="bg-slate-100 px-3 py-2 font-bold border-r border-slate-300">
                        MÉTODO DE PAGO:
                      </div>
                      <div className="px-3 py-2">
                        {metodoPago}
                        {otroMetodo ? ` - ${otroMetodo}` : ''}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-[190px_1fr] border border-slate-300">
                      <div className="bg-slate-100 px-3 py-2 font-bold border-r border-slate-300">
                        CUENTA DE DEPÓSITO
                      </div>
                      <div className="px-3 py-2">
                        BANCO DEL PICHINCHA CUENTA DE AHORROS #2209943288
                      </div>
                    </div>

                    <div className="mt-6 text-right">
                      <p className="font-bold">ATTE:</p>
                      <p className="font-bold">SANTIAGO SANDOVAL</p>
                      <p className="font-bold">TNLGO: ELÉCTRICO</p>
                      <p className="font-extrabold">ELECTROTECNIK SERVICIOS</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white shadow-lg p-6 print:hidden">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
                >
                  <option value="EFECTIVO">EFECTIVO</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="OTRO">OTRO</option>
                </select>

                <input
                  placeholder="Otro método de pago"
                  value={otroMetodo}
                  onChange={(e) => setOtroMetodo(e.target.value)}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
                />
              </div>

              <textarea
                placeholder="Nota importante"
                value={notaImportante}
                onChange={(e) => setNotaImportante(e.target.value)}
                className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 min-h-28 text-black"
              />
            </div>
          </section>
        )}

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
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-red-500 text-white font-bold cursor-pointer"
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
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black"
                >
                  <option value="Repuesto">Repuesto</option>
                  <option value="Insumo">Insumo</option>
                  <option value="Equipo">Equipo</option>
                </select>

                <input
                  type="number"
                  step="0.01"
                  placeholder="Precio de venta"
                  value={form.precio}
                  onChange={(e) => setForm({ ...form, precio: e.target.value })}
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black placeholder-gray-500"
                />

                <input
                  type="number"
                  step="0.01"
                  placeholder="Precio de compra"
                  value={form.precio_compra}
                  onChange={(e) =>
                    setForm({ ...form, precio_compra: e.target.value })
                  }
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-black placeholder-gray-500"
                />

                <input
                  type="number"
                  placeholder="Cantidad"
                  value={form.cantidad}
                  onChange={(e) => setForm({ ...form, cantidad: e.target.value })}
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
                  className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  onClick={saveProducto}
                  className="rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white cursor-pointer"
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
                className="absolute top-3 right-3 bg-red-500 text-white w-8 h-8 rounded-full cursor-pointer"
              >
                X
              </button>

              <h3 className="text-xl font-bold text-slate-900 mb-4">
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
                  <span className="font-semibold">Precio de venta:</span> $
                  {Number(selected.precio).toFixed(2)}
                </p>

                <p>
                  <span className="font-semibold">Precio de compra:</span> $
                  {Number(selected.precio_compra ?? 0).toFixed(2)}
                </p>

                <p>
                  <span className="font-semibold">Cantidad:</span>{' '}
                  {selected.cantidad}
                </p>

                <p>
                  <span className="font-semibold">Descripción:</span>
                  <br />
                  {selected.descripcion || 'Sin descripción'}
                </p>
              </div>
            </div>
          </div>
        )}

        {confirmModalOpen && productoPendiente && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-3xl bg-white shadow-xl p-6 relative">
              <button
                onClick={cerrarConfirmModal}
                className="absolute top-4 right-4 h-9 w-9 rounded-full bg-red-500 text-white font-bold cursor-pointer"
              >
                X
              </button>

              <h3 className="text-xl font-bold text-slate-900 mb-4">
                Confirmar acción
              </h3>

              <p className="text-slate-700 mb-2">
                ¿Deseas {deltaPendiente > 0 ? 'aumentar' : 'disminuir'} la cantidad
                de:
              </p>

              <p className="font-semibold text-slate-900 mb-2">
                {productoPendiente.nombre_producto}
              </p>

              <p className="text-sm text-slate-500 mb-6">
                Cantidad actual: {productoPendiente.cantidad}
              </p>

              <div className="flex justify-end gap-3">
                <button
                  onClick={cerrarConfirmModal}
                  className="rounded-2xl bg-slate-200 px-5 py-3 font-semibold text-slate-700 cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  onClick={confirmarCambioCantidad}
                  className={`rounded-2xl cursor-pointer px-5 py-3 font-semibold text-white ${
                    deltaPendiente > 0 ? 'bg-slate-900' : 'bg-amber-600'
                  }`}
                >
                  {deltaPendiente > 0 ? 'Sí, aumentar' : 'Sí, disminuir'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}