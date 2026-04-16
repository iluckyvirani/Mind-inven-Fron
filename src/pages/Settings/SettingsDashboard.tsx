import { useState, useEffect } from 'react'
import { Button, Input, Select } from '../../components/ui'
import { settingsAPI } from '../../api/endpoints'
import { useAppSelector } from '../../hooks/useRedux'

// Shop Settings Tab
const ShopSettings = () => {
  const { user } = useAppSelector((state) => state.auth)
  const isAdmin = user?.role === 'ADMIN'
  const [settings, setSettings] = useState({
    shopName: '',
    tagline: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    mobile: '',
    email: '',
    website: '',
    gstNumber: '',
    drugLicenseNo: '',
    printHeader: '',
    printFooter: '',
  })
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await settingsAPI.getShop()
        const d = res.data?.data || res.data || {}
        setSettings({
          shopName: d.name || d.shopName || '',
          tagline: d.tagline || '',
          address: d.address || '',
          city: d.city || '',
          state: d.state || '',
          pincode: d.pincode || '',
          phone: d.phone || '',
          mobile: d.mobile || '',
          email: d.email || '',
          website: d.website || '',
          gstNumber: d.gstin || d.gstNumber || '',
          drugLicenseNo: d.licenseNo || d.drugLicenseNo || '',
          printHeader: d.printHeader || '',
          printFooter: d.printFooter || '',
        })
      } catch (err) {
        console.error('Failed to fetch shop settings:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await settingsAPI.updateShop({
        name: settings.shopName,
        tagline: settings.tagline,
        address: settings.address,
        city: settings.city,
        state: settings.state,
        pincode: settings.pincode,
        phone: settings.phone,
        mobile: settings.mobile,
        email: settings.email,
        website: settings.website,
        gstin: settings.gstNumber,
        licenseNo: settings.drugLicenseNo,
        printHeader: settings.printHeader,
        printFooter: settings.printFooter,
      })
      alert('Settings saved successfully!')
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Shop Name *</label>
            <Input
              value={settings.shopName}
              onChange={(e) => setSettings({ ...settings, shopName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tagline</label>
            <Input
              value={settings.tagline}
              onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Address *</label>
            <Input
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
            <Input
              value={settings.city}
              onChange={(e) => setSettings({ ...settings, city: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">State *</label>
            <Input
              value={settings.state}
              onChange={(e) => setSettings({ ...settings, state: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pincode *</label>
            <Input
              value={settings.pincode}
              onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
            <Input
              value={settings.phone}
              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
            <Input
              value={settings.mobile}
              onChange={(e) => setSettings({ ...settings, mobile: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <Input
              type="email"
              value={settings.email}
              onChange={(e) => setSettings({ ...settings, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Website</label>
            <Input
              value={settings.website}
              onChange={(e) => setSettings({ ...settings, website: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Legal Information */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Legal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">GST Number</label>
            <Input
              value={settings.gstNumber}
              onChange={(e) => setSettings({ ...settings, gstNumber: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Drug License No.</label>
            <Input
              value={settings.drugLicenseNo}
              onChange={(e) => setSettings({ ...settings, drugLicenseNo: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Print Settings */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Print Settings</h3>
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Print Header (appears on bills/slips)</label>
            <textarea
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
              rows={3}
              value={settings.printHeader}
              onChange={(e) => setSettings({ ...settings, printHeader: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Print Footer (appears on bills/slips)</label>
            <textarea
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all resize-none"
              rows={2}
              value={settings.printFooter}
              onChange={(e) => setSettings({ ...settings, printFooter: e.target.value })}
            />
          </div>
        </div>
      </div>

      {/* Logo Upload */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Shop Logo</h3>
        <div className="flex items-start gap-6">
          <div className="w-32 h-32 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center bg-slate-50">
            <div className="text-center">
              <svg className="w-8 h-8 text-slate-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs text-slate-500">No logo</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm text-slate-600 mb-3">Upload your shop logo. Recommended size: 200x200px. Supported formats: PNG, JPG.</p>
            <Button variant="outline">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Logo
            </Button>
          </div>
        </div>
      </div>

      {/* Save Button */}
      {isAdmin && (
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} className='from-emerald-600 to-teal-500'>
          {isSaving ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Save Settings
            </>
          )}
        </Button>
      </div>
      )}
    </div>
  )
}

// Team Management Tab
const TeamManagement = () => {
  const { user } = useAppSelector((state) => state.auth)
  const isAdmin = user?.role === 'ADMIN'
  interface StaffMember {
    id: string
    name: string
    role: string
    email: string
    phone: string
    status: string
    lastLogin: string
  }

  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [passwordStaff, setPasswordStaff] = useState<StaffMember | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [newStaff, setNewStaff] = useState({
    name: '',
    role: 'PHARMACIST',
    email: '',
    phone: '',
    username: '',
    password: '',
    status: 'ACTIVE',
  })

  const fetchTeam = async () => {
    try {
      setLoading(true)
      const res = await settingsAPI.getTeam({ limit: 100 })
      const data = res.data?.data || res.data || []
      const mapped = (Array.isArray(data) ? data : []).map((m: any) => ({
        id: m.id,
        name: m.name || '',
        role: (m.role || 'STAFF'),
        email: m.email || '',
        phone: m.phone || '',
        status: (m.status || 'ACTIVE'),
        lastLogin: m.lastLogin || 'Never',
      }))
      setStaff(mapped)
    } catch (err) {
      console.error('Failed to fetch team:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTeam() }, [])

  const displayRole = (role: string) => {
    return role.charAt(0) + role.slice(1).toLowerCase()
  }

  const handleAddStaff = async () => {
    try {
      setSubmitting(true)
      await settingsAPI.addTeamMember({
        name: newStaff.name,
        role: newStaff.role,
        email: newStaff.email,
        phone: newStaff.phone,
        username: newStaff.username,
        password: newStaff.password,
        status: newStaff.status,
      })
      setNewStaff({ name: '', role: 'PHARMACIST', email: '', phone: '', username: '', password: '', status: 'ACTIVE' })
      setShowAddModal(false)
      fetchTeam()
    } catch (err) {
      console.error('Failed to add staff:', err)
      alert('Failed to add staff member')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateStaff = async () => {
    if (!editingStaff) return
    try {
      setSubmitting(true)
      await settingsAPI.updateTeamMember(editingStaff.id, {
        name: editingStaff.name,
        role: editingStaff.role,
        email: editingStaff.email,
        phone: editingStaff.phone,
        status: editingStaff.status,
      })
      setEditingStaff(null)
      fetchTeam()
    } catch (err) {
      console.error('Failed to update staff:', err)
      alert('Failed to update staff member')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordStaff) return
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match')
      return
    }
    try {
      setSubmitting(true)
      await settingsAPI.changeTeamPassword(passwordStaff.id, { newPassword })
      alert('Password changed successfully')
      setPasswordStaff(null)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error('Failed to change password:', err)
      alert('Failed to change password')
    } finally {
      setSubmitting(false)
    }
  }

  const toggleStatus = async (member: StaffMember) => {
    const newStatus = member.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    try {
      await settingsAPI.updateTeamMember(member.id, { status: newStatus })
      fetchTeam()
    } catch (err) {
      console.error('Failed to toggle status:', err)
    }
  }

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-emerald-100 text-emerald-700'
      case 'PHARMACIST': return 'bg-blue-100 text-blue-700'
      case 'CASHIER': return 'bg-purple-100 text-purple-700'
      default: return 'bg-slate-100 text-slate-700'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Team Members</h3>
          <p className="text-sm text-slate-500">Manage staff accounts and permissions</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className='from-emerald-600 to-teal-500'>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Staff
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-800">{staff.length}</p>
          <p className="text-sm text-slate-500">Total Staff</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-emerald-600">{staff.filter(s => s.role === 'ADMIN').length}</p>
          <p className="text-sm text-slate-500">Admins</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-emerald-600">{staff.filter(s => s.status === 'ACTIVE').length}</p>
          <p className="text-sm text-slate-500">Active</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-100">
          <p className="text-2xl font-bold text-slate-400">{staff.filter(s => s.status === 'INACTIVE').length}</p>
          <p className="text-sm text-slate-500">Inactive</p>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Name</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Role</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Phone</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Status</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Last Login</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                        member.role === 'ADMIN' ? 'bg-emerald-500' :
                        member.role === 'PHARMACIST' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}>
                        {member.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{member.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${getRoleBadgeClass(member.role)}`}>
                      {displayRole(member.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{member.email}</td>
                  <td className="px-6 py-4 text-slate-600">{member.phone}</td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(member)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        member.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {member.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">{member.lastLogin}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {isAdmin && (
                      <button
                        onClick={() => setEditingStaff(member)}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      )}
                      {isAdmin && (
                      <button
                        onClick={() => {
                          setPasswordStaff(member)
                          setNewPassword('')
                          setConfirmPassword('')
                        }}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Change Password"
                      >
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Add Staff Member</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <Input
                  value={newStaff.name}
                  onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <Select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                  options={[
                    { value: 'ADMIN', label: 'Admin' },
                    { value: 'PHARMACIST', label: 'Pharmacist' },
                    { value: 'CASHIER', label: 'Cashier' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <Input
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Username *</label>
                <Input
                  value={newStaff.username}
                  onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Password *</label>
                <Input
                  type="password"
                  value={newStaff.password}
                  onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                  placeholder="Enter password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <Select
                  value={newStaff.status}
                  onChange={(e) => setNewStaff({ ...newStaff, status: e.target.value })}
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                  ]}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAddStaff} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Staff'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">Edit Staff Member</h3>
              <button onClick={() => setEditingStaff(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                <Input
                  value={editingStaff.name}
                  onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Role *</label>
                <Select
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                  options={[
                    { value: 'ADMIN', label: 'Admin' },
                    { value: 'PHARMACIST', label: 'Pharmacist' },
                    { value: 'CASHIER', label: 'Cashier' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                <Input
                  type="email"
                  value={editingStaff.email}
                  onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                <Input
                  value={editingStaff.phone}
                  onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <Select
                  value={editingStaff.status}
                  onChange={(e) => setEditingStaff({ ...editingStaff, status: e.target.value })}
                  options={[
                    { value: 'ACTIVE', label: 'Active' },
                    { value: 'INACTIVE', label: 'Inactive' },
                  ]}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setEditingStaff(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleUpdateStaff} disabled={submitting}>
                {submitting ? 'Updating...' : 'Update'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {passwordStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Change Password</h3>
                <p className="text-sm text-slate-500 mt-1">For: {passwordStaff.name} ({passwordStaff.email})</p>
              </div>
              <button onClick={() => { setPasswordStaff(null); setNewPassword(''); setConfirmPassword('') }} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">New Password *</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password *</label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-500">Passwords do not match</p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => { setPasswordStaff(null); setNewPassword(''); setConfirmPassword('') }}>Cancel</Button>
              <Button
                className="flex-1"
                onClick={handleChangePassword}
                disabled={submitting || !newPassword || newPassword !== confirmPassword}
              >
                {submitting ? 'Changing...' : 'Change Password'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Master Data Tab
const MasterData = () => {
  const [activeSection, setActiveSection] = useState('medicineCategories')
  
  // Medicine Categories
  const [medicineCategories, setMedicineCategories] = useState([
    { id: 1, name: 'Antibiotics', count: 42 },
    { id: 2, name: 'Pain Relief', count: 35 },
    { id: 3, name: 'Cardiac', count: 28 },
    { id: 4, name: 'Diabetes', count: 22 },
    { id: 5, name: 'Vitamins & Supplements', count: 30 },
    { id: 6, name: 'Gastro', count: 25 },
    { id: 7, name: 'Skin Care', count: 20 },
    { id: 8, name: 'Respiratory', count: 18 },
  ])
  
  // Payment Modes
  const [paymentModes, setPaymentModes] = useState([
    { id: 1, name: 'Cash', status: 'active' },
    { id: 2, name: 'Card', status: 'active' },
    { id: 3, name: 'UPI', status: 'active' },
    { id: 4, name: 'Bank Transfer', status: 'active' },
    { id: 5, name: 'Credit', status: 'active' },
  ])
  
  // Expense Categories
  const [expenseCategories, setExpenseCategories] = useState([
    { id: 1, name: 'Salaries', icon: '👥', color: 'bg-blue-500', description: 'Staff salaries, pharmacist payments' },
    { id: 2, name: 'Utilities', icon: '💡', color: 'bg-yellow-500', description: 'Electricity, water, internet' },
    { id: 3, name: 'Rent', icon: '🏢', color: 'bg-indigo-500', description: 'Shop rent, lease' },
    { id: 4, name: 'Equipment', icon: '🖥️', color: 'bg-purple-500', description: 'Computer, refrigerator, AC' },
    { id: 5, name: 'Maintenance', icon: '🔧', color: 'bg-orange-500', description: 'Shop repair, equipment maintenance' },
    { id: 6, name: 'Marketing', icon: '📢', color: 'bg-pink-500', description: 'Advertising, promotions' },
    { id: 7, name: 'Insurance', icon: '🛡️', color: 'bg-teal-500', description: 'Shop insurance, stock insurance' },
    { id: 8, name: 'Miscellaneous', icon: '📦', color: 'bg-slate-500', description: 'Other expenses' },
  ])

  // Tax / GST Settings
  const [taxSettings, setTaxSettings] = useState([
    { id: 1, name: 'GST 5%', rate: 5, status: 'active', description: 'Most medicines' },
    { id: 2, name: 'GST 12%', rate: 12, status: 'active', description: 'Ayurvedic & OTC products' },
    { id: 3, name: 'GST 18%', rate: 18, status: 'active', description: 'Cosmetics, supplements' },
    { id: 4, name: 'GST 0%', rate: 0, status: 'active', description: 'Essential medicines (NLEM)' },
  ])
  
  const { user } = useAppSelector((state) => state.auth)
  const isAdmin = user?.role === 'ADMIN'
  const [showAddModal, setShowAddModal] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', description: '', count: 0, status: 'active', icon: '📦', color: 'bg-slate-500', rate: '' })

  const handleAddItem = () => {
    switch (activeSection) {
      case 'medicineCategories':
        setMedicineCategories([...medicineCategories, {
          id: medicineCategories.length + 1,
          name: newItem.name,
          count: 0,
        }])
        break
      case 'paymentModes':
        setPaymentModes([...paymentModes, {
          id: paymentModes.length + 1,
          name: newItem.name,
          status: 'active',
        }])
        break
      case 'expenseCategories':
        setExpenseCategories([...expenseCategories, {
          id: expenseCategories.length + 1,
          name: newItem.name,
          icon: newItem.icon,
          color: newItem.color,
          description: newItem.description,
        }])
        break
      case 'taxSettings':
        setTaxSettings([...taxSettings, {
          id: taxSettings.length + 1,
          name: newItem.name,
          rate: parseFloat(newItem.rate) || 0,
          status: 'active',
          description: newItem.description,
        }])
        break
    }
    setNewItem({ name: '', description: '', count: 0, status: 'active', icon: '📦', color: 'bg-slate-500', rate: '' })
    setShowAddModal(false)
  }

  const sections = [
    { id: 'medicineCategories', label: 'Medicine Categories', icon: '💊' },
    { id: 'paymentModes', label: 'Payment Modes', icon: '💳' },
    { id: 'expenseCategories', label: 'Expense Categories', icon: '💰' },
    { id: 'taxSettings', label: 'Tax / GST', icon: '📋' },
  ]

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
        <div className="flex flex-wrap gap-2">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeSection === section.id
                  ? 'bg-emerald-500 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{section.icon}</span>
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Medicine Categories */}
      {activeSection === 'medicineCategories' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Medicine Categories</h3>
              <p className="text-sm text-slate-500">Manage categories for organizing medicines</p>
            </div>
            <Button onClick={() => setShowAddModal(true)} className='from-emerald-600 to-teal-500'>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Category
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {medicineCategories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <span className="text-lg">💊</span>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{cat.name}</p>
                    <p className="text-sm text-slate-500">{cat.count} medicines</p>
                  </div>
                </div>
                {isAdmin && (
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Modes */}
      {activeSection === 'paymentModes' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Payment Modes</h3>
              <p className="text-sm text-slate-500">Manage accepted payment methods</p>
            </div>
            <Button onClick={() => setShowAddModal(true)} className='from-emerald-600 to-teal-500'>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Payment Mode
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {paymentModes.map(mode => (
              <div key={mode.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    mode.status === 'active' ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}>
                    <svg className={`w-5 h-5 ${mode.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{mode.name}</p>
                    <p className={`text-xs ${mode.status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {mode.status === 'active' ? 'Active' : 'Inactive'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setPaymentModes(paymentModes.map(m => 
                    m.id === mode.id ? { ...m, status: m.status === 'active' ? 'inactive' : 'active' } : m
                  ))}
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    mode.status === 'active' ? 'bg-emerald-500' : 'bg-slate-300'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    mode.status === 'active' ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expense Categories */}
      {activeSection === 'expenseCategories' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Expense Categories</h3>
              <p className="text-sm text-slate-500">Manage expense categories for tracking shop expenses</p>
            </div>
            <Button onClick={() => setShowAddModal(true)} className='from-emerald-600 to-teal-500'>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Category
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {expenseCategories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-emerald-300 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${cat.color} flex items-center justify-center text-lg`}>
                    {cat.icon}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{cat.name}</p>
                    <p className="text-xs text-slate-500">{cat.description}</p>
                  </div>
                </div>
                {isAdmin && (
                <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tax / GST Settings */}
      {activeSection === 'taxSettings' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">Tax / GST Settings</h3>
              <p className="text-sm text-slate-500">Manage tax rates applied to sales</p>
            </div>
            <Button onClick={() => setShowAddModal(true)} className='from-emerald-600 to-teal-500'>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Tax Rate
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Tax Name</th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">Rate (%)</th>
                  <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Applies To</th>
                  <th className="text-center px-6 py-3 text-sm font-semibold text-slate-600">Status</th>
                  <th className="text-right px-6 py-3 text-sm font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {taxSettings.map(tax => (
                  <tr key={tax.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-800">{tax.name}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium">
                        {tax.rate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{tax.description}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => setTaxSettings(taxSettings.map(t =>
                          t.id === tax.id ? { ...t, status: t.status === 'active' ? 'inactive' : 'active' } : t
                        ))}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          tax.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {tax.status === 'active' ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isAdmin && (
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-slate-800">
                Add {activeSection === 'medicineCategories' ? 'Medicine Category' :
                     activeSection === 'paymentModes' ? 'Payment Mode' :
                     activeSection === 'taxSettings' ? 'Tax Rate' : 'Expense Category'}
              </h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <Input
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="Enter name"
                />
              </div>
              {activeSection === 'taxSettings' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Rate (%) *</label>
                    <Input
                      type="number"
                      value={newItem.rate}
                      onChange={(e) => setNewItem({ ...newItem, rate: e.target.value })}
                      placeholder="Enter tax rate"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Applies To</label>
                    <Input
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="e.g., Most medicines"
                    />
                  </div>
                </>
              )}
              {activeSection === 'expenseCategories' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Icon</label>
                    <div className="flex flex-wrap gap-2">
                      {['👥', '💡', '🔧', '💊', '🏢', '📢', '🛡️', '📦', '🚗', '📱', '🍽️', '🖥️'].map(icon => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => setNewItem({ ...newItem, icon })}
                          className={`w-10 h-10 rounded-lg border-2 text-xl flex items-center justify-center transition-colors ${
                            newItem.icon === icon ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: 'bg-blue-500', label: 'Blue' },
                        { value: 'bg-emerald-500', label: 'Green' },
                        { value: 'bg-yellow-500', label: 'Yellow' },
                        { value: 'bg-orange-500', label: 'Orange' },
                        { value: 'bg-red-500', label: 'Red' },
                        { value: 'bg-purple-500', label: 'Purple' },
                        { value: 'bg-pink-500', label: 'Pink' },
                        { value: 'bg-teal-500', label: 'Teal' },
                        { value: 'bg-slate-500', label: 'Gray' },
                      ].map(color => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setNewItem({ ...newItem, color: color.value })}
                          className={`w-8 h-8 rounded-lg ${color.value} transition-transform ${
                            newItem.color === color.value ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : ''
                          }`}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                    <Input
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="e.g., Staff salaries, pharmacist payments"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAddItem}>Add</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Main Settings Dashboard
const SettingsDashboard = () => {
  const [activeTab, setActiveTab] = useState('shop')

  const tabs = [
    { id: 'shop', label: 'Shop Settings', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )},
    { id: 'team', label: 'Team Management', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )},
    { id: 'master', label: 'Master Data', icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    )},
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500">Manage shop settings, team, and master data</p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2">
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-linear-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'shop' && <ShopSettings />}
      {activeTab === 'team' && <TeamManagement />}
      {activeTab === 'master' && <MasterData />}
    </div>
  )
}

export default SettingsDashboard
