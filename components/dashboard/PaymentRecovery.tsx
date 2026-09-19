'use client';
import { useEffect, useState } from 'react';
export default function PaymentRecovery() {
  const [orders, setOrders] = useState<{id:string;checkout_id:string;created_at:string}[]>([]);
  const [message,setMessage] = useState('');
  const [pending,setPending] = useState(false);
  useEffect(()=>{let active=true; fetch('/api/polar/recover').then(r=>r.json()).then(data=>{if(active)setOrders(data.orders ?? [])}).catch(()=>{});return()=>{active=false}},[]);
  if (!orders.length) return null;
  async function recover(checkoutId: string) {
    setPending(true);setMessage('Checking payment…');
    try {
      const r=await fetch('/api/surveys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({checkoutId})});
      const body=await r.json();
      if(!r.ok)throw new Error(body.error ?? 'Could not recover payment.');
      window.location.reload();
    } catch(error){setMessage(error instanceof Error?error.message:'Please try again.');}
    finally{setPending(false);}
  }
  return <section className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 p-4" aria-label="Payment recovery">
    <p className="text-sm">Have you paid for an unfinished checkout? Recover your survey here, including payments made on another device.</p>
    {orders.map(order=><button key={order.id} disabled={pending} onClick={()=>void recover(order.checkout_id)} className="mr-3 mt-3 rounded-lg border border-orange-300 bg-white px-3 py-2 text-sm disabled:opacity-50">Check payment from {new Date(order.created_at).toLocaleDateString()}</button>)}
    <p role="status" className="mt-2 text-sm">{message}</p>
  </section>;
}
