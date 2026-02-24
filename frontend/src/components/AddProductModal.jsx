import { useState } from 'react'
import { addProduct } from '../api'

export default function AddProductModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', url: '', selector: '', interval_minutes: 60 })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await addProduct({
        ...form,
        selector: form.selector || null,
        interval_minutes: parseInt(form.interval_minutes)
      })
      onAdded(res.data)
      onClose()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add product')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Track a new product</h2>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input placeholder="e.g. Sony WH-1000XM5" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required autoFocus />
          </div>
          <div className="form-group">
            <label>URL</label>
            <input placeholder="https://www.amazon.co.uk/dp/..." value={form.url} onChange={e => setForm({...form, url: e.target.value})} required />
          </div>
          <div className="form-group">
            <label>CSS Selector <span style={{color:'#aaa', fontWeight:400}}>(optional — we'll try to detect automatically)</span></label>
            <input placeholder="e.g. .a-price .a-offscreen" value={form.selector} onChange={e => setForm({...form, selector: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Check every</label>
            <select value={form.interval_minutes} onChange={e => setForm({...form, interval_minutes: e.target.value})}>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={360}>6 hours</option>
              <option value={720}>12 hours</option>
              <option value={1440}>24 hours</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Start tracking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
