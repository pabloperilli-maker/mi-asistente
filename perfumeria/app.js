(function () {
  'use strict';

  var LEAD_DIAS_CUOTA = 7; // avisar cuando falten <= 7 días para una cuota
  var DIAS_ENTRE_CUOTAS = 30;

  // --- Estado ---
  var currentUid = null;
  var clientes = [];
  var productos = [];
  var ventas = [];
  var unsubs = [];
  var appIniciada = false;
  var vistaActual = 'view-dashboard';
  var clienteSeleccionadoId = null;
  var cuotasSeleccionadas = 3;
  var rangoReportes = 'mes';

  // --- Elementos: auth ---
  var authScreen = document.getElementById('authScreen');
  var appRoot = document.getElementById('appRoot');
  var authEmail = document.getElementById('authEmail');
  var authPassword = document.getElementById('authPassword');
  var authError = document.getElementById('authError');
  var authLoginBtn = document.getElementById('authLoginBtn');
  var authSignupBtn = document.getElementById('authSignupBtn');
  var userEmailLabel = document.getElementById('userEmailLabel');
  var logoutBtn = document.getElementById('logoutBtn');

  // --- Elementos: toast / modal ---
  var toast = document.getElementById('toast');
  var modalOverlay = document.getElementById('modalOverlay');
  var modalCard = document.getElementById('modalCard');

  // --- Elementos: dashboard ---
  var statGananciaMes = document.getElementById('statGananciaMes');
  var statVentasHoy = document.getElementById('statVentasHoy');
  var statSaldoPendiente = document.getElementById('statSaldoPendiente');
  var statCuotasActivas = document.getElementById('statCuotasActivas');
  var dashAlertas = document.getElementById('dashAlertas');
  var dashSinAlertas = document.getElementById('dashSinAlertas');
  var notifBadge = document.getElementById('notifBadge');
  var btnNotificaciones = document.getElementById('btnNotificaciones');
  var btnNuevaVentaDash = document.getElementById('btnNuevaVentaDash');

  // --- Elementos: clientes ---
  var listaClientes = document.getElementById('listaClientes');
  var clientesEmpty = document.getElementById('clientesEmpty');
  var buscarCliente = document.getElementById('buscarCliente');
  var btnNuevoCliente = document.getElementById('btnNuevoCliente');

  // --- Elementos: detalle cliente ---
  var detalleClienteNombre = document.getElementById('detalleClienteNombre');
  var detalleClienteTelefono = document.getElementById('detalleClienteTelefono');
  var detalleEstadoPill = document.getElementById('detalleEstadoPill');
  var detalleSaldo = document.getElementById('detalleSaldo');
  var detalleCompras = document.getElementById('detalleCompras');
  var detalleSinCompras = document.getElementById('detalleSinCompras');
  var btnVolverClientes = document.getElementById('btnVolverClientes');
  var btnCompartirEstado = document.getElementById('btnCompartirEstado');

  // --- Elementos: nueva venta ---
  var ventaProducto = document.getElementById('ventaProducto');
  var ventaProductoInfo = document.getElementById('ventaProductoInfo');
  var ventaCliente = document.getElementById('ventaCliente');
  var ventaPrecio = document.getElementById('ventaPrecio');
  var ventaCuotasRow = document.getElementById('ventaCuotasRow');
  var resumenTotal = document.getElementById('resumenTotal');
  var resumenCuotasLabel = document.getElementById('resumenCuotasLabel');
  var resumenCuotaMonto = document.getElementById('resumenCuotaMonto');
  var resumenPrimeraFecha = document.getElementById('resumenPrimeraFecha');
  var ventaError = document.getElementById('ventaError');
  var btnConfirmarVenta = document.getElementById('btnConfirmarVenta');
  var btnCerrarNuevaVenta = document.getElementById('btnCerrarNuevaVenta');

  // --- Elementos: stock ---
  var listaProductos = document.getElementById('listaProductos');
  var productosEmpty = document.getElementById('productosEmpty');
  var buscarProducto = document.getElementById('buscarProducto');
  var btnNuevoProducto = document.getElementById('btnNuevoProducto');

  // --- Elementos: notificaciones ---
  var notifCuotas = document.getElementById('notifCuotas');
  var notifCuotasEmpty = document.getElementById('notifCuotasEmpty');
  var notifStock = document.getElementById('notifStock');
  var notifStockEmpty = document.getElementById('notifStockEmpty');
  var btnVolverDashboard = document.getElementById('btnVolverDashboard');

  // --- Elementos: reportes ---
  var reportesSegmentado = document.getElementById('reportesSegmentado');
  var repVentas = document.getElementById('repVentas');
  var repGanancia = document.getElementById('repGanancia');
  var repCuotasCobradas = document.getElementById('repCuotasCobradas');
  var repBars = document.getElementById('repBars');
  var repTopProductos = document.getElementById('repTopProductos');
  var repEmpty = document.getElementById('repEmpty');

  // --- Iconos ---
  var ICONS = {
    warn: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="13"/><line x1="12" y1="16" x2="12" y2="16.01"/></svg>',
    box: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2"/><path d="M3 10h18"/><path d="M7 15h.01"/></svg>',
    clock: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    chevron: '<svg class="icon muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    undo: '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 7"/></svg>'
  };

  // --- Utilidades ---
  function formatMoney(n) {
    n = Math.round(n || 0);
    return '$' + n.toLocaleString('es-AR');
  }
  function nuevoId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
  function diasEntre(fechaISO) {
    return (new Date(fechaISO).getTime() - Date.now()) / 86400000;
  }
  function formatFecha(fechaISO) {
    var d = new Date(fechaISO);
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }
  function iniciales(nombre) {
    var partes = (nombre || '').trim().split(/\s+/);
    return ((partes[0] || '')[0] || '') + ((partes[1] || '')[0] || '');
  }
  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s == null ? '' : String(s);
    return div.innerHTML;
  }

  function saldoVenta(v) {
    return v.cuotas.reduce(function (acc, c) { return acc + Math.max(0, c.monto - c.montoPagado); }, 0);
  }
  function ventaCompletada(v) { return saldoVenta(v) <= 0.005; }

  function ventasDeCliente(clienteId) {
    return ventas.filter(function (v) { return v.clienteId === clienteId; });
  }
  function saldoCliente(clienteId) {
    return ventasDeCliente(clienteId).reduce(function (acc, v) { return acc + saldoVenta(v); }, 0);
  }
  function estadoCliente(clienteId) {
    var vencida = false, proxima = false;
    ventasDeCliente(clienteId).forEach(function (v) {
      if (ventaCompletada(v)) return;
      v.cuotas.forEach(function (c) {
        if (c.montoPagado >= c.monto) return;
        var d = diasEntre(c.fechaVencimiento);
        if (d < 0) vencida = true;
        else if (d <= LEAD_DIAS_CUOTA) proxima = true;
      });
    });
    if (vencida) return 'danger';
    if (proxima) return 'warn';
    return 'ok';
  }
  function textoEstadoCliente(clienteId) {
    var estado = estadoCliente(clienteId);
    if (estado === 'danger') return 'Vencido';
    if (estado === 'ok' && saldoCliente(clienteId) <= 0.005) return 'Al día';
    if (estado === 'warn') {
      var min = null;
      ventasDeCliente(clienteId).forEach(function (v) {
        v.cuotas.forEach(function (c) {
          if (c.montoPagado >= c.monto) return;
          var d = diasEntre(c.fechaVencimiento);
          if (d >= 0 && (min === null || d < min)) min = d;
        });
      });
      return 'Vence en ' + Math.max(1, Math.round(min)) + ' día' + (Math.round(min) === 1 ? '' : 's');
    }
    return 'Al día';
  }

  function productoStockEstado(p) {
    if (p.stock <= 0) return 'danger';
    if (p.stock <= p.stockMinimo) return 'warn';
    return 'ok';
  }

  // --- Toast ---
  var toastTimer = null;
  var suprimirClickAfuera = false;
  function mostrarToast(msg, opciones) {
    opciones = opciones || {};
    toast.innerHTML = '';
    var span = document.createElement('span');
    span.textContent = msg;
    toast.appendChild(span);
    if (opciones.onUndo) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Deshacer';
      btn.addEventListener('click', function (e) { e.stopPropagation(); opciones.onUndo(); ocultarToast(); });
      toast.appendChild(btn);
    }
    var cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.setAttribute('aria-label', 'Cerrar aviso');
    cerrar.textContent = '✕';
    cerrar.addEventListener('click', function (e) { e.stopPropagation(); ocultarToast(); });
    toast.appendChild(cerrar);
    toast.hidden = false;
    suprimirClickAfuera = true;
    setTimeout(function () { suprimirClickAfuera = false; }, 0);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(ocultarToast, opciones.duracion || 2500);
  }
  function ocultarToast() { toast.hidden = true; clearTimeout(toastTimer); }
  document.addEventListener('click', function (e) {
    if (suprimirClickAfuera) return;
    if (!toast.hidden && !toast.contains(e.target)) ocultarToast();
  });

  // --- Modal ---
  function abrirModal(html, onMount) {
    modalCard.innerHTML = html;
    modalOverlay.hidden = false;
    if (onMount) onMount(modalCard);
  }
  function cerrarModal() { modalOverlay.hidden = true; modalCard.innerHTML = ''; }
  modalOverlay.addEventListener('click', function (e) { if (e.target === modalOverlay) cerrarModal(); });

  // --- Navegación ---
  function mostrarVista(id) {
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = (v.id !== id); });
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.view === id); });
    vistaActual = id;
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () { mostrarVista(tab.dataset.view); });
  });
  btnNotificaciones.addEventListener('click', function () { mostrarVista('view-notificaciones'); });
  btnVolverDashboard.addEventListener('click', function () { mostrarVista('view-dashboard'); });
  btnVolverClientes.addEventListener('click', function () { mostrarVista('view-clientes'); });
  btnCerrarNuevaVenta.addEventListener('click', function () { mostrarVista('view-dashboard'); });
  btnNuevaVentaDash.addEventListener('click', function () { abrirNuevaVenta(); });

  // ===================== CLIENTES =====================
  function crearCardCliente(c) {
    var estado = estadoCliente(c.id);
    var saldo = saldoCliente(c.id);
    var ultimaVenta = ventasDeCliente(c.id).sort(function (a, b) { return new Date(b.fechaVenta) - new Date(a.fechaVenta); })[0];
    var sub = ultimaVenta ? 'Última compra: ' + formatFecha(ultimaVenta.fechaVenta) : 'Sin compras todavía';
    var row = document.createElement('div');
    row.className = 'client-row';
    row.style.cursor = 'pointer';
    row.innerHTML =
      '<div class="avatar">' + escapeHtml(iniciales(c.nombre).toUpperCase()) + '</div>' +
      '<div style="flex:1; min-width:0;">' +
        '<div style="font-size:15px; font-weight:600;">' + escapeHtml(c.nombre) + '</div>' +
        '<div class="stat-label">' + escapeHtml(sub) + '</div>' +
      '</div>' +
      '<div style="text-align:right;">' +
        '<div style="font-size:14.5px; font-weight:700;">' + formatMoney(saldo) + '</div>' +
        '<span class="pill ' + estado + '">' + escapeHtml(textoEstadoCliente(c.id)) + '</span>' +
      '</div>';
    row.addEventListener('click', function () { abrirClienteDetalle(c.id); });
    return row;
  }

  function renderClientes() {
    var q = (buscarCliente.value || '').trim().toLowerCase();
    var lista = clientes.filter(function (c) { return c.nombre.toLowerCase().indexOf(q) !== -1; });
    lista.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    listaClientes.innerHTML = '';
    lista.forEach(function (c) { listaClientes.appendChild(crearCardCliente(c)); });
    clientesEmpty.hidden = clientes.length > 0;
    listaClientes.hidden = clientes.length === 0;
  }
  buscarCliente.addEventListener('input', renderClientes);

  function formularioCliente(clienteExistente) {
    var esEdicion = !!clienteExistente;
    abrirModal(
      '<h3>' + (esEdicion ? 'Editar cliente' : 'Nuevo cliente') + '</h3>' +
      '<div class="field-label">Nombre</div>' +
      '<input id="mCliNombre" type="text" placeholder="Nombre y apellido" />' +
      '<div class="field-label">Teléfono (opcional)</div>' +
      '<input id="mCliTelefono" type="tel" placeholder="11 2345-6789" />' +
      '<div class="modal-buttons">' +
        '<button id="mCliCancelar" class="btn-block btn-soft-block" type="button" style="background:#f2f4f9;color:var(--text-muted);">Cancelar</button>' +
        '<button id="mCliGuardar" class="btn-block btn-primary-block" type="button">Guardar</button>' +
      '</div>',
      function (root) {
        if (esEdicion) {
          root.querySelector('#mCliNombre').value = clienteExistente.nombre || '';
          root.querySelector('#mCliTelefono').value = clienteExistente.telefono || '';
        }
        root.querySelector('#mCliCancelar').addEventListener('click', cerrarModal);
        root.querySelector('#mCliGuardar').addEventListener('click', function () {
          var nombre = root.querySelector('#mCliNombre').value.trim();
          var telefono = root.querySelector('#mCliTelefono').value.trim();
          if (!nombre) { root.querySelector('#mCliNombre').focus(); return; }
          var id = esEdicion ? clienteExistente.id : nuevoId();
          var datos = { nombre: nombre, telefono: telefono, createdAt: esEdicion ? clienteExistente.createdAt : new Date().toISOString() };
          window.FB.setDoc(window.FB.documento(currentUid, 'clientes', id), datos).catch(function () {
            mostrarToast('No se pudo guardar. Revisá tu conexión.');
          });
          cerrarModal();
          mostrarToast(esEdicion ? 'Cliente actualizado' : 'Cliente agregado');
        });
      }
    );
  }
  btnNuevoCliente.addEventListener('click', function () { formularioCliente(null); });

  // ===================== DETALLE DE CLIENTE =====================
  function abrirClienteDetalle(id) {
    clienteSeleccionadoId = id;
    renderClienteDetalle();
    mostrarVista('view-cliente-detalle');
  }

  function crearFilaCuota(venta, cuota) {
    var pagadaCompleta = cuota.montoPagado >= cuota.monto;
    var vencida = !pagadaCompleta && diasEntre(cuota.fechaVencimiento) < 0;
    var color = pagadaCompleta ? 'var(--ok)' : (vencida ? 'var(--danger)' : (cuota.montoPagado > 0 ? 'var(--warn)' : 'var(--border)'));
    var row = document.createElement('div');
    row.className = 'cuota-item-row';
    var detalleTexto = pagadaCompleta ? 'Pagada' : (cuota.montoPagado > 0 ? 'Pagado ' + formatMoney(cuota.montoPagado) + ' de ' + formatMoney(cuota.monto) : (vencida ? 'Vencida' : 'Pendiente'));
    row.innerHTML =
      '<div class="cuota-dot" style="background:' + color + ';"></div>' +
      '<div style="flex:1;">' +
        '<div style="font-size:13.5px;">Cuota ' + cuota.numero + ' · ' + formatFecha(cuota.fechaVencimiento) + '</div>' +
        '<div style="font-size:11px; color:var(--text-muted);">' + escapeHtml(detalleTexto) + '</div>' +
      '</div>';
    if (!pagadaCompleta) {
      var btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.cssText = 'background:var(--blue); color:#fff;';
      btn.textContent = 'Registrar pago';
      btn.addEventListener('click', function () { formularioPago(venta, cuota); });
      row.appendChild(btn);
    }
    return row;
  }

  function renderClienteDetalle() {
    var c = clientes.find(function (x) { return x.id === clienteSeleccionadoId; });
    if (!c) return;
    detalleClienteNombre.textContent = c.nombre;
    detalleClienteTelefono.textContent = c.telefono || '';
    var estado = estadoCliente(c.id);
    detalleEstadoPill.className = 'pill ' + estado;
    detalleEstadoPill.textContent = textoEstadoCliente(c.id);
    detalleSaldo.textContent = formatMoney(saldoCliente(c.id));

    var compras = ventasDeCliente(c.id).sort(function (a, b) { return new Date(b.fechaVenta) - new Date(a.fechaVenta); });
    detalleCompras.innerHTML = '';
    compras.forEach(function (v) {
      var pagado = v.cuotas.reduce(function (acc, cc) { return acc + Math.min(cc.montoPagado, cc.monto); }, 0);
      var total = v.cuotas.reduce(function (acc, cc) { return acc + cc.monto; }, 0);
      var pagadasCount = v.cuotas.filter(function (cc) { return cc.montoPagado >= cc.monto; }).length;
      var pct = total > 0 ? Math.round((pagado / total) * 100) : 100;
      var card = document.createElement('div');
      card.className = 'card';
      card.style.cssText = 'padding:16px; margin-bottom:14px;';
      card.innerHTML =
        '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">' +
          '<div>' +
            '<div style="font-size:14.5px; font-weight:600;">' + escapeHtml(v.productoNombre) + '</div>' +
            '<div class="stat-label">Comprado el ' + formatFecha(v.fechaVenta) + ' · Total ' + formatMoney(total) + '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">' +
          '<div class="progress-track" style="flex:1;"><div class="progress-fill" style="width:' + pct + '%;"></div></div>' +
          '<div style="font-size:11.5px; color:var(--text-muted); white-space:nowrap;">' + pagadasCount + '/' + v.cuotas.length + ' cuotas</div>' +
        '</div>' +
        '<div class="cuotas-list"></div>';
      var listCont = card.querySelector('.cuotas-list');
      v.cuotas.forEach(function (cc) { listCont.appendChild(crearFilaCuota(v, cc)); });
      detalleCompras.appendChild(card);
    });
    detalleSinCompras.hidden = compras.length > 0;
    detalleCompras.hidden = compras.length === 0;
  }

  function formularioPago(venta, cuota) {
    var restante = cuota.monto - cuota.montoPagado;
    abrirModal(
      '<h3>Registrar pago — Cuota ' + cuota.numero + '</h3>' +
      '<div class="stat-label" style="margin-bottom:12px;">Restan ' + formatMoney(restante) + ' de ' + formatMoney(cuota.monto) + '</div>' +
      '<div class="field-label">Monto a registrar</div>' +
      '<input id="mPagoMonto" type="number" inputmode="decimal" />' +
      '<div class="modal-buttons">' +
        '<button id="mPagoCancelar" class="btn-block" type="button" style="background:#f2f4f9;color:var(--text-muted);">Cancelar</button>' +
        '<button id="mPagoGuardar" class="btn-block btn-primary-block" type="button">Registrar</button>' +
      '</div>',
      function (root) {
        var input = root.querySelector('#mPagoMonto');
        input.value = restante;
        root.querySelector('#mPagoCancelar').addEventListener('click', cerrarModal);
        root.querySelector('#mPagoGuardar').addEventListener('click', function () {
          var monto = parseFloat(input.value);
          if (!(monto > 0)) { input.focus(); return; }
          var nuevasCuotas = venta.cuotas.map(function (cc) {
            if (cc.numero !== cuota.numero) return cc;
            return Object.assign({}, cc, { montoPagado: Math.min(cc.monto, cc.montoPagado + monto) });
          });
          window.FB.updateDoc(window.FB.documento(currentUid, 'ventas', venta.id), { cuotas: nuevasCuotas }).catch(function () {
            mostrarToast('No se pudo registrar el pago.');
          });
          cerrarModal();
          mostrarToast('Pago registrado');
        });
      }
    );
  }

  btnCompartirEstado.addEventListener('click', function () {
    var c = clientes.find(function (x) { return x.id === clienteSeleccionadoId; });
    if (!c) return;
    var saldo = saldoCliente(c.id);
    var texto = 'Hola ' + c.nombre + '! Te paso tu estado de cuenta en Perfumería Mora: saldo pendiente ' + formatMoney(saldo) + '.';
    if (navigator.share) {
      navigator.share({ text: texto }).catch(function () {});
    } else {
      window.open('https://wa.me/?text=' + encodeURIComponent(texto), '_blank');
    }
  });

  // ===================== NUEVA VENTA =====================
  function poblarSelectsVenta() {
    ventaProducto.innerHTML = '';
    productos.filter(function (p) { return p.stock > 0; }).forEach(function (p) {
      var opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = p.nombre + ' — Stock: ' + p.stock + ' — sugerido ' + formatMoney(p.precioVenta);
      ventaProducto.appendChild(opt);
    });
    ventaCliente.innerHTML = '';
    clientes.slice().sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); }).forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.nombre;
      ventaCliente.appendChild(opt);
    });
  }

  function actualizarInfoProducto() {
    var p = productos.find(function (x) { return x.id === ventaProducto.value; });
    if (!p) { ventaProductoInfo.textContent = ''; return; }
    ventaProductoInfo.textContent = 'Costo ' + formatMoney(p.costo) + ' · Precio sugerido ' + formatMoney(p.precioVenta);
    if (!ventaPrecio.value || parseFloat(ventaPrecio.value) === 0) ventaPrecio.value = p.precioVenta;
    actualizarResumenVenta();
  }
  ventaProducto.addEventListener('change', actualizarInfoProducto);

  ventaCuotasRow.querySelectorAll('.cuota-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      ventaCuotasRow.querySelectorAll('.cuota-pill').forEach(function (p) { p.classList.remove('selected'); });
      pill.classList.add('selected');
      cuotasSeleccionadas = parseInt(pill.dataset.n, 10);
      actualizarResumenVenta();
    });
  });
  ventaPrecio.addEventListener('input', actualizarResumenVenta);

  function actualizarResumenVenta() {
    var total = parseFloat(ventaPrecio.value) || 0;
    var n = cuotasSeleccionadas;
    var montoCuota = n > 0 ? Math.round(total / n) : 0;
    resumenTotal.textContent = formatMoney(total);
    resumenCuotasLabel.textContent = n + ' cuota' + (n === 1 ? '' : 's') + ' de';
    resumenCuotaMonto.textContent = formatMoney(montoCuota);
    var primera = new Date();
    primera.setDate(primera.getDate() + DIAS_ENTRE_CUOTAS);
    resumenPrimeraFecha.textContent = formatFecha(primera.toISOString());
  }

  function abrirNuevaVenta() {
    ventaError.hidden = true;
    poblarSelectsVenta();
    cuotasSeleccionadas = 3;
    ventaCuotasRow.querySelectorAll('.cuota-pill').forEach(function (p) { p.classList.toggle('selected', p.dataset.n === '3'); });
    if (productos.filter(function (p) { return p.stock > 0; }).length === 0) {
      ventaProductoInfo.textContent = 'No tenés productos con stock disponible.';
    }
    actualizarInfoProducto();
    mostrarVista('view-nueva-venta');
  }

  btnConfirmarVenta.addEventListener('click', function () {
    ventaError.hidden = true;
    var p = productos.find(function (x) { return x.id === ventaProducto.value; });
    var c = clientes.find(function (x) { return x.id === ventaCliente.value; });
    var total = parseFloat(ventaPrecio.value) || 0;
    if (!p) { ventaError.textContent = 'Elegí un producto con stock disponible.'; ventaError.hidden = false; return; }
    if (!c) { ventaError.textContent = 'Elegí (o creá) un cliente.'; ventaError.hidden = false; return; }
    if (!(total > 0)) { ventaError.textContent = 'Ingresá un precio de venta válido.'; ventaError.hidden = false; return; }

    var n = cuotasSeleccionadas;
    var base = Math.floor(total / n);
    var resto = total - base * n;
    var fechaVenta = new Date();
    var cuotas = [];
    for (var i = 1; i <= n; i++) {
      var vencimiento = new Date(fechaVenta);
      vencimiento.setDate(vencimiento.getDate() + DIAS_ENTRE_CUOTAS * i);
      cuotas.push({
        numero: i,
        monto: base + (i === n ? resto : 0),
        montoPagado: 0,
        fechaVencimiento: vencimiento.toISOString()
      });
    }
    var ventaId = nuevoId();
    var venta = {
      clienteId: c.id,
      clienteNombre: c.nombre,
      productoId: p.id,
      productoNombre: p.nombre,
      precioVenta: total,
      costoUnitario: p.costo,
      cantidadCuotas: n,
      cuotas: cuotas,
      fechaVenta: fechaVenta.toISOString()
    };
    window.FB.setDoc(window.FB.documento(currentUid, 'ventas', ventaId), venta).catch(function () {
      mostrarToast('No se pudo guardar la venta.');
    });
    window.FB.updateDoc(window.FB.documento(currentUid, 'productos', p.id), { stock: Math.max(0, p.stock - 1) }).catch(function () {});

    mostrarToast('Venta registrada: ' + p.nombre + ' a ' + c.nombre);
    ventaPrecio.value = '';
    mostrarVista('view-dashboard');
  });

  // ===================== STOCK =====================
  function crearCardProducto(p) {
    var estado = productoStockEstado(p);
    var textoStock = p.stock <= 0 ? 'Sin stock' : (p.stock + ' unidad' + (p.stock === 1 ? '' : 'es'));
    var ganancia = p.precioVenta - p.costo;
    var row = document.createElement('div');
    row.className = 'prod-row';
    row.style.flexDirection = 'column';
    row.style.alignItems = 'stretch';
    row.style.cursor = 'pointer';
    row.innerHTML =
      '<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px;">' +
        '<div style="font-size:14.5px; font-weight:600;">' + escapeHtml(p.nombre) + '</div>' +
        '<span class="pill ' + estado + '">' + escapeHtml(textoStock) + '</span>' +
      '</div>' +
      '<div class="stat-label">Costo ' + formatMoney(p.costo) + ' · Venta ' + formatMoney(p.precioVenta) + ' · Ganancia ' + formatMoney(ganancia) + '</div>';
    row.addEventListener('click', function () { formularioProducto(p); });
    return row;
  }

  function renderStock() {
    var q = (buscarProducto.value || '').trim().toLowerCase();
    var lista = productos.filter(function (p) { return p.nombre.toLowerCase().indexOf(q) !== -1; });
    lista.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    listaProductos.innerHTML = '';
    lista.forEach(function (p) { listaProductos.appendChild(crearCardProducto(p)); });
    productosEmpty.hidden = productos.length > 0;
    listaProductos.hidden = productos.length === 0;
  }
  buscarProducto.addEventListener('input', renderStock);

  function formularioProducto(productoExistente) {
    var esEdicion = !!productoExistente;
    abrirModal(
      '<h3>' + (esEdicion ? 'Editar producto' : 'Nuevo producto') + '</h3>' +
      '<div class="field-label">Nombre</div>' +
      '<input id="mProdNombre" type="text" placeholder="Ej: Chanel N°5 100ml" />' +
      '<div class="field-label">Costo</div>' +
      '<input id="mProdCosto" type="number" inputmode="decimal" />' +
      '<div class="field-label">Precio de venta</div>' +
      '<input id="mProdPrecio" type="number" inputmode="decimal" />' +
      '<div class="field-label">Stock disponible</div>' +
      '<input id="mProdStock" type="number" inputmode="numeric" />' +
      '<div class="field-label">Avisar cuando el stock llegue a</div>' +
      '<input id="mProdMinimo" type="number" inputmode="numeric" />' +
      '<div class="modal-buttons">' +
        '<button id="mProdCancelar" class="btn-block" type="button" style="background:#f2f4f9;color:var(--text-muted);">Cancelar</button>' +
        '<button id="mProdGuardar" class="btn-block btn-primary-block" type="button">Guardar</button>' +
      '</div>',
      function (root) {
        if (esEdicion) {
          root.querySelector('#mProdNombre').value = productoExistente.nombre || '';
          root.querySelector('#mProdCosto').value = productoExistente.costo || 0;
          root.querySelector('#mProdPrecio').value = productoExistente.precioVenta || 0;
          root.querySelector('#mProdStock').value = productoExistente.stock || 0;
          root.querySelector('#mProdMinimo').value = productoExistente.stockMinimo || 3;
        } else {
          root.querySelector('#mProdMinimo').value = 3;
        }
        root.querySelector('#mProdCancelar').addEventListener('click', cerrarModal);
        root.querySelector('#mProdGuardar').addEventListener('click', function () {
          var nombre = root.querySelector('#mProdNombre').value.trim();
          if (!nombre) { root.querySelector('#mProdNombre').focus(); return; }
          var datos = {
            nombre: nombre,
            costo: parseFloat(root.querySelector('#mProdCosto').value) || 0,
            precioVenta: parseFloat(root.querySelector('#mProdPrecio').value) || 0,
            stock: parseInt(root.querySelector('#mProdStock').value, 10) || 0,
            stockMinimo: parseInt(root.querySelector('#mProdMinimo').value, 10) || 3
          };
          var id = esEdicion ? productoExistente.id : nuevoId();
          window.FB.setDoc(window.FB.documento(currentUid, 'productos', id), datos).catch(function () {
            mostrarToast('No se pudo guardar. Revisá tu conexión.');
          });
          cerrarModal();
          mostrarToast(esEdicion ? 'Producto actualizado' : 'Producto agregado');
        });
      }
    );
  }
  btnNuevoProducto.addEventListener('click', function () { formularioProducto(null); });

  // ===================== DASHBOARD Y NOTIFICACIONES =====================
  function cuotasPendientesTodas() {
    var lista = [];
    ventas.forEach(function (v) {
      v.cuotas.forEach(function (c) {
        if (c.montoPagado >= c.monto) return;
        lista.push({ venta: v, cuota: c, dias: diasEntre(c.fechaVencimiento) });
      });
    });
    return lista;
  }

  function renderDashboard() {
    var hoyStr = new Date().toDateString();
    var inicioMes = new Date(); inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);

    var ventasMes = ventas.filter(function (v) { return new Date(v.fechaVenta) >= inicioMes; });
    var gananciaMes = ventasMes.reduce(function (acc, v) { return acc + (v.precioVenta - v.costoUnitario); }, 0);
    var ventasHoy = ventas.filter(function (v) { return new Date(v.fechaVenta).toDateString() === hoyStr; });
    var totalHoy = ventasHoy.reduce(function (acc, v) { return acc + v.precioVenta; }, 0);

    statGananciaMes.textContent = formatMoney(gananciaMes);
    statVentasHoy.textContent = formatMoney(totalHoy);

    var pendientes = cuotasPendientesTodas();
    var saldoTotal = pendientes.reduce(function (acc, x) { return acc + (x.cuota.monto - x.cuota.montoPagado); }, 0);
    statSaldoPendiente.textContent = formatMoney(saldoTotal);
    statCuotasActivas.textContent = pendientes.length + ' cuota' + (pendientes.length === 1 ? '' : 's') + ' activa' + (pendientes.length === 1 ? '' : 's');

    var vencidas = pendientes.filter(function (x) { return x.dias < 0; });
    var porVencer = pendientes.filter(function (x) { return x.dias >= 0 && x.dias <= LEAD_DIAS_CUOTA; });
    var stockBajo = productos.filter(function (p) { return p.stock <= p.stockMinimo; });

    dashAlertas.innerHTML = '';
    if (vencidas.length + porVencer.length > 0) {
      var montoAlerta = vencidas.concat(porVencer).reduce(function (acc, x) { return acc + (x.cuota.monto - x.cuota.montoPagado); }, 0);
      var partes = [];
      if (porVencer.length) partes.push(porVencer.length + ' por vencer');
      if (vencidas.length) partes.push(vencidas.length + ' vencida' + (vencidas.length === 1 ? '' : 's'));
      dashAlertas.appendChild(crearFilaAlerta('warn', ICONS.warn,
        (vencidas.length + porVencer.length) + ' cuota' + ((vencidas.length + porVencer.length) === 1 ? ' necesita' : 's necesitan') + ' atención',
        partes.join(' y ') + ' · ' + formatMoney(montoAlerta),
        function () { mostrarVista('view-notificaciones'); }));
    }
    if (stockBajo.length > 0) {
      dashAlertas.appendChild(crearFilaAlerta('danger', ICONS.box,
        stockBajo.length + ' producto' + (stockBajo.length === 1 ? '' : 's') + ' necesita' + (stockBajo.length === 1 ? '' : 'n') + ' reposición',
        stockBajo.map(function (p) { return p.nombre; }).join(', '),
        function () { mostrarVista('view-notificaciones'); }));
    }
    dashSinAlertas.hidden = (vencidas.length + porVencer.length + stockBajo.length) > 0;
    dashAlertas.hidden = (vencidas.length + porVencer.length + stockBajo.length) === 0;

    var totalAlertas = vencidas.length + stockBajo.length;
    notifBadge.hidden = totalAlertas === 0;
  }

  function crearFilaAlerta(tipo, iconoSvg, titulo, subtitulo, onClick) {
    var row = document.createElement('div');
    row.className = 'alert-row';
    row.style.cursor = 'pointer';
    row.innerHTML =
      '<div class="alert-icon ' + tipo + '">' + iconoSvg + '</div>' +
      '<div style="flex:1;">' +
        '<div style="font-size:14.5px; font-weight:600;">' + escapeHtml(titulo) + '</div>' +
        '<div class="stat-label">' + escapeHtml(subtitulo) + '</div>' +
      '</div>' + ICONS.chevron;
    row.addEventListener('click', onClick);
    return row;
  }

  function renderNotificaciones() {
    var pendientes = cuotasPendientesTodas().filter(function (x) { return x.dias <= LEAD_DIAS_CUOTA; })
      .sort(function (a, b) { return a.dias - b.dias; });
    notifCuotas.innerHTML = '';
    pendientes.forEach(function (x) {
      var vencida = x.dias < 0;
      var row = document.createElement('div');
      row.className = 'notif-row';
      row.style.borderLeft = '4px solid ' + (vencida ? 'var(--danger)' : 'var(--warn)');
      var textoTiempo = vencida ? 'vencida hace ' + Math.abs(Math.round(x.dias)) + ' día' + (Math.abs(Math.round(x.dias)) === 1 ? '' : 's')
        : 'vence en ' + Math.max(1, Math.round(x.dias)) + ' día' + (Math.round(x.dias) === 1 ? '' : 's');
      row.innerHTML =
        '<div style="margin-top:2px; color:' + (vencida ? 'var(--danger)' : 'var(--warn)') + ';">' + ICONS.clock + '</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:14px; font-weight:600;">' + escapeHtml(x.venta.clienteNombre) + '</div>' +
          '<div class="stat-label">Cuota de ' + formatMoney(x.cuota.monto - x.cuota.montoPagado) + ' ' + textoTiempo + '</div>' +
        '</div>';
      notifCuotas.appendChild(row);
    });
    notifCuotasEmpty.hidden = pendientes.length > 0;
    notifCuotas.hidden = pendientes.length === 0;

    var stockBajo = productos.filter(function (p) { return p.stock <= p.stockMinimo; })
      .sort(function (a, b) { return a.stock - b.stock; });
    notifStock.innerHTML = '';
    stockBajo.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'notif-row';
      row.style.borderLeft = '4px solid ' + (p.stock <= 0 ? 'var(--danger)' : 'var(--warn)');
      row.innerHTML =
        '<div style="margin-top:2px; color:' + (p.stock <= 0 ? 'var(--danger)' : 'var(--warn)') + ';">' + ICONS.box + '</div>' +
        '<div style="flex:1;">' +
          '<div style="font-size:14px; font-weight:600;">' + escapeHtml(p.nombre) + '</div>' +
          '<div class="stat-label">' + (p.stock <= 0 ? 'Sin unidades disponibles' : 'Quedan solo ' + p.stock + ' unidades') + '</div>' +
        '</div>';
      notifStock.appendChild(row);
    });
    notifStockEmpty.hidden = stockBajo.length > 0;
    notifStock.hidden = stockBajo.length === 0;
  }

  // ===================== REPORTES =====================
  reportesSegmentado.querySelectorAll('.segment').forEach(function (seg) {
    seg.addEventListener('click', function () {
      reportesSegmentado.querySelectorAll('.segment').forEach(function (s) { s.classList.remove('selected'); });
      seg.classList.add('selected');
      rangoReportes = seg.dataset.rango;
      renderReportes();
    });
  });

  function inicioRango(rango) {
    var d = new Date();
    if (rango === 'hoy') { d.setHours(0, 0, 0, 0); return d; }
    if (rango === 'semana') { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
    d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  }

  function renderReportes() {
    var desde = inicioRango(rangoReportes);
    var ventasRango = ventas.filter(function (v) { return new Date(v.fechaVenta) >= desde; });
    var totalVentas = ventasRango.reduce(function (acc, v) { return acc + v.precioVenta; }, 0);
    var totalGanancia = ventasRango.reduce(function (acc, v) { return acc + (v.precioVenta - v.costoUnitario); }, 0);
    // Simplificación: total histórico cobrado en cuotas (no solo del rango elegido).
    var cuotasCobradas = ventas.reduce(function (acc, v) { return acc + v.cuotas.reduce(function (a2, c) { return a2 + c.montoPagado; }, 0); }, 0);

    repVentas.textContent = formatMoney(totalVentas);
    repGanancia.textContent = formatMoney(totalGanancia);
    repCuotasCobradas.textContent = formatMoney(cuotasCobradas);

    // Barras: ventas por dia, ultimos 7 dias
    var dias = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
      dias.push(d);
    }
    var montosPorDia = dias.map(function (d) {
      var siguiente = new Date(d); siguiente.setDate(siguiente.getDate() + 1);
      return ventas.filter(function (v) { var f = new Date(v.fechaVenta); return f >= d && f < siguiente; })
        .reduce(function (acc, v) { return acc + v.precioVenta; }, 0);
    });
    var max = Math.max.apply(null, montosPorDia.concat([1]));
    var etiquetasDias = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
    repBars.innerHTML = '';
    dias.forEach(function (d, idx) {
      var col = document.createElement('div');
      col.className = 'bar-col';
      var alto = Math.max(3, Math.round((montosPorDia[idx] / max) * 100));
      col.innerHTML = '<div class="bar" style="height:' + alto + '%;" title="' + formatMoney(montosPorDia[idx]) + '"></div>';
      repBars.appendChild(col);
    });

    var porProducto = {};
    ventasRango.forEach(function (v) {
      porProducto[v.productoNombre] = (porProducto[v.productoNombre] || 0) + 1;
    });
    var topProductos = Object.keys(porProducto).map(function (nombre) { return { nombre: nombre, unidades: porProducto[nombre] }; })
      .sort(function (a, b) { return b.unidades - a.unidades; }).slice(0, 5);
    repTopProductos.innerHTML = '';
    topProductos.forEach(function (t) {
      var row = document.createElement('div');
      row.className = 'top-row';
      row.innerHTML = '<span style="font-size:14px;">' + escapeHtml(t.nombre) + '</span><span style="font-size:13.5px; font-weight:700; color:var(--text-muted);">' + t.unidades + ' unidad' + (t.unidades === 1 ? '' : 'es') + '</span>';
      repTopProductos.appendChild(row);
    });
    repEmpty.hidden = topProductos.length > 0;
    repTopProductos.hidden = topProductos.length === 0;
  }

  // ===================== RENDER GENERAL =====================
  function renderTodo() {
    renderDashboard();
    renderClientes();
    renderStock();
    renderNotificaciones();
    renderReportes();
    if (vistaActual === 'view-cliente-detalle' && clienteSeleccionadoId) renderClienteDetalle();
  }

  // --- Notificaciones push (mismo patrón/limitaciones que la agenda de voz) ---
  function pedirPermisoNotificaciones() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') Notification.requestPermission();
  }
  function notificar(titulo, cuerpo) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try { new Notification(titulo, { body: cuerpo, icon: 'icon.svg' }); } catch (e) {}
  }
  function chequearAvisos() {
    var cambios = false;
    ventas.forEach(function (v) {
      v.cuotas.forEach(function (c) {
        if (c.montoPagado >= c.monto) return;
        var d = diasEntre(c.fechaVencimiento);
        if (d <= LEAD_DIAS_CUOTA && !c.notificada) {
          notificar('Cuota de ' + v.clienteNombre, (d < 0 ? 'Vencida' : 'Vence en ' + Math.max(1, Math.round(d)) + ' días') + ' · ' + formatMoney(c.monto - c.montoPagado));
          c.notificada = true;
          cambios = true;
          window.FB.updateDoc(window.FB.documento(currentUid, 'ventas', v.id), { cuotas: v.cuotas }).catch(function () {});
        }
      });
    });
  }

  // ===================== AUTENTICACIÓN Y ARRANQUE =====================
  function mostrarErrorAuth(msg) { authError.textContent = msg; authError.hidden = false; }
  function limpiarErrorAuth() { authError.hidden = true; }
  function traducirErrorAuth(err) {
    var code = (err && err.code) || '';
    if (code.indexOf('wrong-password') !== -1 || code.indexOf('invalid-credential') !== -1) return 'Contraseña incorrecta.';
    if (code.indexOf('user-not-found') !== -1) return 'No existe una cuenta con ese correo. Tocá "Crear cuenta".';
    if (code.indexOf('email-already-in-use') !== -1) return 'Ya existe una cuenta con ese correo. Iniciá sesión.';
    if (code.indexOf('weak-password') !== -1) return 'La contraseña debe tener al menos 6 caracteres.';
    if (code.indexOf('invalid-email') !== -1) return 'El correo no es válido.';
    return 'Ocurrió un error. Probá de nuevo.';
  }
  function iniciarSesion() {
    limpiarErrorAuth();
    var email = authEmail.value.trim(), pass = authPassword.value;
    if (!email || !pass) { mostrarErrorAuth('Completá correo y contraseña.'); return; }
    window.FB.signIn(email, pass).catch(function (err) { mostrarErrorAuth(traducirErrorAuth(err)); });
  }
  function crearCuenta() {
    limpiarErrorAuth();
    var email = authEmail.value.trim(), pass = authPassword.value;
    if (!email || !pass) { mostrarErrorAuth('Completá correo y contraseña.'); return; }
    window.FB.signUp(email, pass).catch(function (err) { mostrarErrorAuth(traducirErrorAuth(err)); });
  }
  authLoginBtn.addEventListener('click', iniciarSesion);
  authSignupBtn.addEventListener('click', crearCuenta);
  authPassword.addEventListener('keydown', function (e) { if (e.key === 'Enter') iniciarSesion(); });
  logoutBtn.addEventListener('click', function () { window.FB.logout(); });

  function escucharColeccion(nombre, destino) {
    return window.FB.onColeccionSnapshot(currentUid, nombre, function (snap) {
      destino.length = 0;
      snap.forEach(function (docSnap) {
        var data = docSnap.data();
        data.id = docSnap.id;
        destino.push(data);
      });
      renderTodo();
    });
  }

  function iniciarApp(uid) {
    if (appIniciada) return;
    appIniciada = true;
    unsubs.push(escucharColeccion('clientes', clientes));
    unsubs.push(escucharColeccion('productos', productos));
    unsubs.push(escucharColeccion('ventas', ventas));
    setInterval(chequearAvisos, 30000);
  }

  function cerrarApp() {
    appIniciada = false;
    unsubs.forEach(function (u) { u && u(); });
    unsubs = [];
    clientes.length = 0; productos.length = 0; ventas.length = 0;
    currentUid = null;
  }

  function esperarFirebase(cb) {
    if (window.FB) { cb(); return; }
    window.addEventListener('firebase-ready', cb, { once: true });
  }

  esperarFirebase(function () {
    window.FB.onAuthStateChanged(function (user) {
      if (user) {
        currentUid = user.uid;
        authScreen.hidden = true;
        appRoot.hidden = false;
        userEmailLabel.textContent = user.email || '';
        mostrarVista('view-dashboard');
        iniciarApp(user.uid);
        pedirPermisoNotificaciones();
      } else {
        cerrarApp();
        authScreen.hidden = false;
        appRoot.hidden = true;
      }
    });
  });
})();
