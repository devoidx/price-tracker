import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAdminUsers, getAdminProducts, deactivateUser } from '../api'
import { UserX } from 'lucide-react'

export default function Admin() {
  const queryClient = useQueryClient()

  const { data: users = [] } = useQuery({ queryKey: ['adminUsers'], queryFn: () => getAdminUsers().then(r => r.data) })
  const { data: products = [] } = useQuery({ queryKey: ['adminProducts'], queryFn: () => getAdminProducts().then(r => r.data) })

  const handleDeactivate = async (userId, username) => {
    if (!confirm(`Deactivate user ${username}?`)) return
    await deactivateUser(userId)
    queryClient.invalidateQueries(['adminUsers'])
  }

  return (
    <div className="page">
      <h1 className="page-title">Admin panel</h1>

      <div className="card" style={{marginBottom:'1.25rem'}}>
        <h2 style={{marginBottom:'1rem', fontSize:'1rem', fontWeight:600}}>Users ({users.length})</h2>
        <table className="table">
          <thead>
            <tr><th>Username</th><th>Email</th><th>Admin</th><th>Status</th><th>Joined</th><th></th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id}>
                <td style={{fontWeight:500}}>{u.username}</td>
                <td style={{color:'#888'}}>{u.email}</td>
                <td>{u.is_admin ? '✅' : '—'}</td>
                <td>
                  <span style={{color: u.active ? '#22c55e' : '#d1d5db', fontWeight:600, fontSize:'0.8rem'}}>
                    {u.active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{color:'#aaa', fontSize:'0.8rem'}}>{new Date(u.created_at).toLocaleDateString()}</td>
                <td>
                  {u.active && !u.is_admin && (
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeactivate(u.id, u.username)}>
                      <UserX size={13} /> Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 style={{marginBottom:'1rem', fontSize:'1rem', fontWeight:600}}>All tracked products ({products.length})</h2>
        <table className="table">
          <thead>
            <tr><th>Name</th><th>URL</th><th>Interval</th><th>Status</th></tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td style={{fontWeight:500}}>{p.name}</td>
                <td style={{color:'#888', fontSize:'0.8rem', maxWidth:'300px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.url}</td>
                <td>{p.interval_minutes < 60 ? `${p.interval_minutes}m` : `${p.interval_minutes/60}h`}</td>
                <td>
                  <span style={{color: p.active ? '#22c55e' : '#d1d5db', fontWeight:600, fontSize:'0.8rem'}}>
                    {p.active ? 'Active' : 'Paused'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
