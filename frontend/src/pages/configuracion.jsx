import { useEffect, useState } from 'react'
import authService from '../services/api'
export default function ConfiguracionPage(){
 const [f,setF]=useState({}); useEffect(()=>{authService.getFacturacionConfig().then(setF)},[])
 const save=async()=>{await authService.saveFacturacionConfig(f); alert('Guardado')}
 return <div style={{padding:20}}><h2>Configuración de factura</h2>{['nombre','nit','direccion','telefono','resolucion','autorizada','prefijo','responsable'].map(k=><div key={k}><input value={f[k]||''} onChange={e=>setF({...f,[k]:e.target.value})} placeholder={k}/></div>)}<button onClick={save}>Guardar</button></div>
}
