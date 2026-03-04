import React, { useState } from 'react';
import { Calendar, Clock, User, CheckCircle2, XCircle, AlertCircle, MoreVertical, Trash2, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useStore } from '../store/useStore';
import { Modal } from '../components/Modal';
import { Toast, ToastType } from '../components/Toast';

export const Appointments: React.FC = () => {
  const [appointments, setAppointments] = React.useState<any[]>([]);
  const { token } = useStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [newAppointment, setNewAppointment] = useState({
    customerName: '',
    service: '',
    date: '',
    time: ''
  });

  React.useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await fetch('/api/appointments', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAppointments(data);
        } else {
            // Mock data
            setAppointments([
                { id: 1, customer: { name: 'João Silva' }, notes: 'Corte de Cabelo', date: new Date().toISOString(), status: 'CONFIRMED' },
                { id: 2, customer: { name: 'Maria Oliveira' }, notes: 'Manicure', date: new Date(Date.now() + 86400000).toISOString(), status: 'PENDING' },
                { id: 3, customer: { name: 'Carlos Souza' }, notes: 'Barba', date: new Date(Date.now() - 86400000).toISOString(), status: 'CANCELLED' },
            ]);
        }
      } catch (e) {
        console.error(e);
        // Mock data fallback
        setAppointments([
            { id: 1, customer: { name: 'João Silva' }, notes: 'Corte de Cabelo', date: new Date().toISOString(), status: 'CONFIRMED' },
            { id: 2, customer: { name: 'Maria Oliveira' }, notes: 'Manicure', date: new Date(Date.now() + 86400000).toISOString(), status: 'PENDING' },
            { id: 3, customer: { name: 'Carlos Souza' }, notes: 'Barba', date: new Date(Date.now() - 86400000).toISOString(), status: 'CANCELLED' },
        ]);
      }
    };
    fetchAppointments();
  }, [token]);

  const handleStatusChange = (id: number, newStatus: string) => {
    setAppointments(appointments.map(apt => apt.id === id ? { ...apt, status: newStatus } : apt));
    setToast({ message: `Status atualizado para ${newStatus === 'CONFIRMED' ? 'Confirmado' : 'Cancelado'}`, type: 'success' });
  };

  const handleDelete = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este agendamento?')) {
        setAppointments(appointments.filter(apt => apt.id !== id));
        setToast({ message: 'Agendamento excluído.', type: 'info' });
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const newApt = {
        id: Date.now(),
        customer: { name: newAppointment.customerName },
        notes: newAppointment.service,
        date: new Date(`${newAppointment.date}T${newAppointment.time}`).toISOString(),
        status: 'PENDING'
    };
    setAppointments([newApt, ...appointments]);
    setIsModalOpen(false);
    setNewAppointment({ customerName: '', service: '', date: '', time: '' });
    setToast({ message: 'Agendamento criado com sucesso!', type: 'success' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">Confirmado</span>;
      case 'PENDING':
        return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">Pendente</span>;
      case 'CANCELLED':
        return <span className="bg-destructive/10 text-destructive border border-destructive/20 px-2 py-1 rounded-lg text-[10px] font-bold uppercase">Cancelado</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Agenda de Serviços</h2>
          <p className="text-muted-foreground">Gerencie os agendamentos realizados via WhatsApp e IA.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
        >
          Novo Agendamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase">Confirmados</p>
            <p className="text-xl font-bold">{appointments.filter(a => a.status === 'CONFIRMED').length}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase">Pendentes</p>
            <p className="text-xl font-bold">{appointments.filter(a => a.status === 'PENDING').length}</p>
          </div>
        </div>
        <div className="glass-card p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-bold uppercase">Cancelados</p>
            <p className="text-xl font-bold">{appointments.filter(a => a.status === 'CANCELLED').length}</p>
          </div>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-muted/30">
                <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Cliente</th>
                <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Serviço</th>
                <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Data/Hora</th>
                <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
                <th className="px-8 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {appointments.map((apt) => (
                <tr key={apt.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                        {(apt.customer?.name || 'C').split(' ').map((n: string) => n[0]).join('')}
                      </div>
                      <span className="font-bold">{apt.customer?.name || 'Cliente'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-sm font-medium">{apt.notes || 'Serviço'}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold">{new Date(apt.date).toLocaleDateString()}</span>
                      <span className="text-xs text-muted-foreground">{new Date(apt.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {getStatusBadge(apt.status)}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {apt.status === 'PENDING' && (
                            <>
                                <button onClick={() => handleStatusChange(apt.id, 'CONFIRMED')} className="p-2 rounded-lg hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors" title="Confirmar">
                                    <Check className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleStatusChange(apt.id, 'CANCELLED')} className="p-2 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors" title="Cancelar">
                                    <XCircle className="w-4 h-4" />
                                </button>
                            </>
                        )}
                        <button onClick={() => handleDelete(apt.id)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Excluir">
                            <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Agendamento"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Cliente</label>
            <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="Nome do cliente" 
                required 
                value={newAppointment.customerName}
                onChange={e => setNewAppointment({...newAppointment, customerName: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Serviço</label>
            <input 
                type="text" 
                className="w-full p-2 rounded-lg border border-border bg-background" 
                placeholder="Ex: Corte de Cabelo" 
                required 
                value={newAppointment.service}
                onChange={e => setNewAppointment({...newAppointment, service: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium mb-1">Data</label>
                <input 
                    type="date" 
                    className="w-full p-2 rounded-lg border border-border bg-background" 
                    required 
                    value={newAppointment.date}
                    onChange={e => setNewAppointment({...newAppointment, date: e.target.value})}
                />
            </div>
            <div>
                <label className="block text-sm font-medium mb-1">Hora</label>
                <input 
                    type="time" 
                    className="w-full p-2 rounded-lg border border-border bg-background" 
                    required 
                    value={newAppointment.time}
                    onChange={e => setNewAppointment({...newAppointment, time: e.target.value})}
                />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg hover:bg-muted transition-colors">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold hover:opacity-90 transition-opacity">Agendar</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
