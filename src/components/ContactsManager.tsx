"use client";

import { useState, useEffect } from "react";
import { Phone, Star, Plus, Trash2, Pencil } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { formatTcallId } from "@/lib/tcallId";
import { getLanguage, getUI } from "@/lib/languages";
import { useCallContext } from "@/components/providers/CallProvider";
import { TcallLogo } from "@/components/TcallLogo";

interface Contact {
  id: string;
  name: string;
  tcallId: string;
  favorite: boolean;
  notes?: string | null;
}

interface ContactsManagerProps {
  userLanguage: string;
}

export function ContactsManager({ userLanguage }: ContactsManagerProps) {
  const ui = getUI(userLanguage);
  const { dial } = useCallContext();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", tcallId: "", favorite: false, notes: "" });
  const [dialError, setDialError] = useState("");

  const load = () => {
    apiFetch("/api/contacts")
      .then((r) => r.json())
      .then((d) => setContacts(d.contacts || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const saveContact = async () => {
    const tcallId = form.tcallId.replace(/\D/g, "");
    if (!form.name || tcallId.length !== 9) return;

    if (editId) {
      await apiFetch(`/api/contacts/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, favorite: form.favorite, notes: form.notes }),
      });
    } else {
      await apiFetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tcallId }),
      });
    }
    setShowForm(false);
    setEditId(null);
    setForm({ name: "", tcallId: "", favorite: false, notes: "" });
    load();
  };

  const deleteContact = async (id: string) => {
    await apiFetch(`/api/contacts/${id}`, { method: "DELETE" });
    load();
  };

  const handleDial = async (tcallId: string) => {
    setDialError("");
    try {
      await dial(tcallId);
    } catch {
      setDialError(ui.dialError);
    }
  };

  if (loading) {
    return (
      <div className="ios-empty-state">
        <TcallLogo size="sm" animate />
      </div>
    );
  }

  const grouped = contacts.reduce<Record<string, Contact[]>>((acc, c) => {
    const letter = c.name[0]?.toUpperCase() || "#";
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(c);
    return acc;
  }, {});

  return (
    <div>
      {dialError && <div className="ios-error-banner mb-3">{dialError}</div>}

      <button
        onClick={() => { setShowForm(true); setEditId(null); setForm({ name: "", tcallId: "", favorite: false, notes: "" }); }}
        className="btn-secondary w-full mb-4 flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> {ui.addContact}
      </button>

      {showForm && (
        <div className="glass rounded-2xl p-4 mb-4 space-y-3">
          <input className="input-field" placeholder={ui.name} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          {!editId && (
            <input className="input-field font-mono" placeholder="123456789" value={form.tcallId} onChange={(e) => setForm({ ...form, tcallId: e.target.value.replace(/\D/g, "").slice(0, 9) })} />
          )}
          <input className="input-field" placeholder={ui.notes} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.favorite} onChange={(e) => setForm({ ...form, favorite: e.target.checked })} />
            <Star className="w-4 h-4 text-yellow-400" /> {ui.favorite}
          </label>
          <div className="flex gap-2">
            <button onClick={saveContact} className="btn-primary flex-1">{ui.save}</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary flex-1">{ui.close}</button>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <div className="ios-empty-state">
          <p>{ui.noContacts}</p>
          <p className="text-xs text-slate-400 mt-2">{ui.noContactsDesc}</p>
        </div>
      ) : (
        <div className="ios-contacts">
          {Object.keys(grouped).sort().map((letter) => (
            <div key={letter}>
              <p className="ios-section-header">{letter}</p>
              <ul className="ios-list">
                {grouped[letter].map((contact) => (
                  <li key={contact.id} className="ios-list-item ios-contact-item">
                    <div className="ios-contact-avatar">{contact.name[0]?.toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate flex items-center gap-1">
                        {contact.name}
                        {contact.favorite && <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">{formatTcallId(contact.tcallId)}</p>
                      {contact.notes && <p className="text-xs text-slate-400 truncate">{contact.notes}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditId(contact.id); setForm({ name: contact.name, tcallId: contact.tcallId, favorite: contact.favorite, notes: contact.notes || "" }); setShowForm(true); }}
                        className="ios-icon-btn w-8 h-8"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteContact(contact.id)} className="ios-icon-btn w-8 h-8 text-red-400">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          window.dispatchEvent(
                            new CustomEvent("tcall:open-chat", { detail: { tcallId: contact.tcallId } })
                          );
                        }}
                        className="ios-icon-btn w-8 h-8 text-brand-600"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => void handleDial(contact.tcallId)} className="ios-mini-call-btn">
                        <Phone className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
