import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../services/api';
import '../styles/checkout.css';

const money=(n)=>`$${Math.round(Number(n||0)).toLocaleString('es-CO')}`;
export default function CheckoutPage(){
  const navigate=useNavigate(); const [params]=useSearchParams(); const mesa=Number(params.get('mesa'));
  const [pedido,setPedido]=useState(null); const [ventas,setVentas]=useState([]); const [metodo,setMetodo]=useState('Efectivo');
  const [montoRecibido,setMontoRecibido]=useState(''); const [propina,setPropina]=useState(false); const [showConfirm,setShowConfirm]=useState(false);
  const [cliente,setCliente]=useState({nombre:'Consumidor Final',documento:'000000'});
  useEffect(()=>{(async()=>{const [pedidos,v]=await Promise.all([authService.getPedidos(),authService.getVentas()]);setVentas(v||[]);setPedido((pedidos||[]).find(p=>Number(p.mesa)===mesa&&p.estado!=='entregado')||null)})()},[mesa]);
  const subtotal=useMemo(()=> (pedido?.productos||[]).reduce((s,i)=>s+Number(i.precio||0)*Number(i.cantidad||1),0),[pedido]);
  const iva=Math.round(subtotal*0.19); const tip=propina?Math.round(subtotal*0.1):0; const total=subtotal+iva+tip;
  const cambio=Number(montoRecibido||0)-total;
  const doPay=async()=>{if(!pedido) return; const r=await authService.checkoutPedido({pedidoId:pedido._id,cliente,incluirPropina:propina,metodoPago:metodo}); window.open(`${import.meta.env.VITE_API_URL.replace(/\/api$/,'')}${r.pdfUrl}`,'_blank'); setShowConfirm(false); navigate('/mesas');}

  return <div className='checkout-page'>
    <div className='page-header'><div className='ph-icon'></div><div><div className='ph-title'>Completar Venta</div><div className='ph-sub'>Mesa {mesa} • {pedido?`Pedido #${String(pedido._id).slice(-5)}`:'Sin pedido'}</div></div></div>
    <div className='main-grid'>
      <div className='order-panel'>
        <div className='order-title'>Resumen del Pedido</div>
        <div className='order-items'>{(pedido?.productos||[]).map((i,idx)=><div key={idx} className='item-row'><div className='item-qty'>{i.cantidad}</div><div className='item-info'><div>{i.nombre}</div></div><div className='item-price'>{money(Number(i.precio||0)*Number(i.cantidad||1))}</div></div>)}</div>
        <div className='order-summary'><div className='summary-row'><span>Subtotal</span><span>{money(subtotal)}</span></div><div className='summary-row'><span>IVA</span><span>{money(iva)}</span></div>{propina&&<div className='summary-row'><span>Propina</span><span>{money(tip)}</span></div>}<div className='summary-row total'><span>Total</span><span className='summary-value'>{money(total)}</span></div></div>
      </div>
      <div className='sidebar-panel'>
        <div className='payment-card'><div>Método de Pago</div><div className='payment-methods'>{['Efectivo','Tarjeta','Transferencia','QR'].map(m=><button key={m} className={`payment-opt ${metodo===m?'selected':''}`} onClick={()=>setMetodo(m)}>{m}</button>)}</div><input className='amount-input' value={montoRecibido} onChange={e=>setMontoRecibido(e.target.value)} placeholder='0' /></div>
        <div className='extra-card'><div className='extra-item'><span>Propina (10%)</span><input type='checkbox' checked={propina} onChange={e=>setPropina(e.target.checked)} /></div><div className='extra-item'><span>Cliente</span><input value={cliente.nombre} onChange={e=>setCliente({...cliente,nombre:e.target.value})}/></div><div className='extra-item'><span>Documento</span><input value={cliente.documento} onChange={e=>setCliente({...cliente,documento:e.target.value})}/></div>{metodo==='Efectivo'&&<div className='extra-item'><span>Cambio</span><strong>{cambio>=0?money(cambio):'$0'}</strong></div>}</div>
        <button className='complete-btn' onClick={()=>setShowConfirm(true)}>Completar Venta</button>
      </div>
    </div>
    <h3 style={{marginTop:16}}>Panel de ventas</h3><ul>{ventas.map(v=><li key={v._id}>{v.numero} - {money(v.total)} <button onClick={()=>window.open(`${import.meta.env.VITE_API_URL.replace(/\/api$/,'')}/api/facturas/${v.numero}/pdf`,'_blank')}>Imprimir/Exportar PDF</button></li>)}</ul>
    {showConfirm&&<div className='modal-overlay' onClick={()=>setShowConfirm(false)}><div className='modal-content' onClick={e=>e.stopPropagation()}><h3>¿Completar venta?</h3><p>Se generará factura PDF y se guardará en BD.</p><button onClick={doPay}>Confirmar</button></div></div>}
  </div>
}
