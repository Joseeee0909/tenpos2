import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import authService from '../services/api'

export default function CheckoutPage(){
  const [params] = useSearchParams(); const mesa = Number(params.get('mesa'))
  const [pedido,setPedido]=useState(null); const [cliente,setCliente]=useState({nombre:'Consumidor Final',documento:'000000',direccion:''}); const [propina,setPropina]=useState(false); const [ventas,setVentas]=useState([]); const [config,setConfig]=useState({})
  useEffect(()=>{(async()=>{const [pedidos, v, c]= await Promise.all([authService.getPedidos(),authService.getVentas(),authService.getFacturacionConfig()]);
    setVentas(v); setConfig(c||{}); setPedido((pedidos||[]).find(p=>Number(p.mesa)===mesa && p.estado!=='entregado')||null) })()},[mesa])
  const subtotal = useMemo(()=> (pedido?.productos||[]).reduce((s,i)=>s+Number(i.precio||0)*Number(i.cantidad||1),0),[pedido]);
  const iva=Math.round(subtotal*0.19); const tip=propina?Math.round(subtotal*0.1):0; const total=subtotal+iva+tip
  const pagar=async()=>{ if(!pedido) return; const r= await authService.checkoutPedido({ pedidoId:pedido._id, cliente, incluirPropina:propina, metodoPago:'Efectivo' }); window.open(`${import.meta.env.VITE_API_URL.replace(/\/api$/,'')}${r.pdfUrl}`,'_blank'); const nv= await authService.getVentas(); setVentas(nv) }
  return <div style={{padding:20}}><h2>Checkout mesa {mesa}</h2><h3>{config.nombre}</h3>{pedido? <>
  <ul>{(pedido.productos||[]).map((i,idx)=><li key={idx}>{i.cantidad} {i.nombre} - ${i.precio}</li>)}</ul>
  <input value={cliente.nombre} onChange={e=>setCliente({...cliente,nombre:e.target.value})} placeholder='Cliente'/>
  <input value={cliente.documento} onChange={e=>setCliente({...cliente,documento:e.target.value})} placeholder='Documento'/>
  <label><input type='checkbox' checked={propina} onChange={e=>setPropina(e.target.checked)}/> Incluir propina 10%</label>
  <p>Subtotal: {subtotal} IVA: {iva} Total: {total}</p>
  <button onClick={pagar}>Completar venta y exportar PDF</button></> : <p>No hay pedido activo.</p>}
  <h3>Panel de ventas</h3><ul>{ventas.map(v=><li key={v._id}>{v.numero} - {v.total} <button onClick={()=>window.open(`${import.meta.env.VITE_API_URL.replace(/\/api$/,'')}/api/facturas/${v.numero}/pdf`,'_blank')}>Imprimir/Exportar PDF</button></li>)}</ul></div>
}
