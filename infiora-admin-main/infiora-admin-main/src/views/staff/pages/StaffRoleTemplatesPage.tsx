import React, { useState } from 'react';
import {
  Box, Button, Card, CardContent, Checkbox, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, Divider, FormControlLabel,
  IconButton, Stack, TextField, Tooltip, Typography,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import { toast } from 'react-toastify';

import {
  useGetStaffRoleTemplatesQuery,
  useDeleteStaffRoleTemplateMutation,
  type IStaffRoleTemplate,
} from '@/redux/api/staffApi';

const ALL_PERMISSIONS = [
  'orders:view', 'orders:accept', 'orders:complete', 'orders:cancel',
  'bookings:view', 'bookings:confirm', 'bookings:cancel',
  'housekeeping:view', 'housekeeping:manage',
  'maintenance:view', 'maintenance:manage',
  'catalog:view', 'catalog:manage',
  'staff:view', 'staff:manage',
  'analytics:view', 'settings:manage',
];

const MODULES = ['orders', 'bookings', 'housekeeping', 'maintenance', 'catalog', 'analytics'];

type FormState = { name: string; permissions: string[]; visibleModules: string[] };

function RoleTemplateDialog({
  open,
  onClose,
  onSave,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormState) => Promise<void>;
  initial?: FormState;
}) {
  const [form, setForm] = useState<FormState>(
    initial ?? { name: '', permissions: [], visibleModules: [] }
  );
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setForm(initial ?? { name: '', permissions: [], visibleModules: [] });
  }, [open]);

  const togglePerm = (p: string) =>
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(p)
        ? f.permissions.filter((x) => x !== p)
        : [...f.permissions, p],
    }));

  const toggleModule = (m: string) =>
    setForm((f) => ({
      ...f,
      visibleModules: f.visibleModules.includes(m)
        ? f.visibleModules.filter((x) => x !== m)
        : [...f.visibleModules, m],
    }));

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Name is required');
    setSaving(true);
    try {
      await onSave(form);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{initial ? 'Edit Template' : 'New Role Template'}</DialogTitle>
      <DialogContent>
        <Stack gap={2.5} mt={1}>
          <TextField
            label="Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            size="small"
            fullWidth
          />
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Permissions
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
              {ALL_PERMISSIONS.map((p) => (
                <FormControlLabel
                  key={p}
                  control={
                    <Checkbox
                      size="small"
                      checked={form.permissions.includes(p)}
                      onChange={() => togglePerm(p)}
                    />
                  }
                  label={<Typography variant="caption">{p}</Typography>}
                />
              ))}
            </Stack>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase">
              Visible Modules
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
              {MODULES.map((m) => (
                <FormControlLabel
                  key={m}
                  control={
                    <Checkbox
                      size="small"
                      checked={form.visibleModules.includes(m)}
                      onChange={() => toggleModule(m)}
                    />
                  }
                  label={<Typography variant="caption">{m}</Typography>}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function StaffRoleTemplatesPage() {
  const { data: templates = [], isLoading } = useGetStaffRoleTemplatesQuery();
  const [deleteTemplate] = useDeleteStaffRoleTemplateMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<IStaffRoleTemplate | null>(null);

  const handleDelete = async (t: IStaffRoleTemplate) => {
    if (!confirm(`Delete template "${t.name}"?`)) return;
    try {
      await (deleteTemplate as any)({ hotelId: 'global', roleId: t.id }).unwrap();
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  };

  const handleSave = async (_data: FormState) => {
    toast.info('Template management requires a super-admin endpoint — coming soon');
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Staff Role Templates</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => { setEditing(null); setDialogOpen(true); }}
        >
          New Template
        </Button>
      </Stack>

      {isLoading ? (
        <Box textAlign="center" py={6}><CircularProgress /></Box>
      ) : (templates as IStaffRoleTemplate[]).length === 0 ? (
        <Typography color="text.secondary" textAlign="center" py={6}>
          No global role templates yet.
        </Typography>
      ) : (
        <Stack gap={2}>
          {(templates as IStaffRoleTemplate[]).map((t) => (
            <Card key={t.id} variant="outlined">
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Stack gap={1}>
                    <Typography variant="subtitle1" fontWeight={700}>{t.name}</Typography>
                    <Stack direction="row" flexWrap="wrap" gap={0.5}>
                      {t.permissions.map((p) => (
                        <Chip key={p} label={p} size="small" variant="outlined" />
                      ))}
                    </Stack>
                    {t.visibleModules?.length > 0 && (
                      <>
                        <Divider />
                        <Stack direction="row" flexWrap="wrap" gap={0.5}>
                          {t.visibleModules.map((m) => (
                            <Chip key={m} label={m} size="small" color="primary" />
                          ))}
                        </Stack>
                      </>
                    )}
                  </Stack>
                  <Stack direction="row" gap={0.5}>
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => { setEditing(t); setDialogOpen(true); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton size="small" color="error" onClick={() => handleDelete(t)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      <RoleTemplateDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        initial={editing ? { name: editing.name, permissions: editing.permissions, visibleModules: editing.visibleModules } : undefined}
      />
    </Box>
  );
}
