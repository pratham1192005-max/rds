const API = '/api/employees';
const $ = (id) => document.getElementById(id);

const form = $('empForm');
const msg = $('message');
let searchTimer;

function show(text, type = 'ok') {
  msg.textContent = text;
  msg.className = 'message ' + type;
  if (text) setTimeout(() => { msg.textContent = ''; }, 4000);
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

async function checkDb() {
  const badge = $('dbStatus');
  try {
    await api('/api/health');
    badge.textContent = 'RDS connected';
    badge.className = 'badge ok';
  } catch (e) {
    badge.textContent = 'RDS not connected';
    badge.className = 'badge err';
  }
}

// READ
async function loadEmployees() {
  const q = $('search').value.trim();
  try {
    const rows = await api(API + (q ? '?search=' + encodeURIComponent(q) : ''));
    $('count').textContent = `(${rows.length})`;
    $('tbody').innerHTML = rows.length
      ? rows.map((r) => `
        <tr>
          <td>${r.id}</td>
          <td>${esc(r.name)}</td>
          <td>${esc(r.email)}</td>
          <td>${esc(r.department)}</td>
          <td>₹${Number(r.salary).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          <td class="actions-cell">
            <button class="btn small" data-edit="${r.id}">Edit</button>
            <button class="btn small danger" data-del="${r.id}">Delete</button>
          </td>
        </tr>`).join('')
      : '<tr><td colspan="6" class="empty">No employees found.</td></tr>';
  } catch (e) {
    show(e.message, 'err');
  }
}

function resetForm() {
  form.reset();
  $('empId').value = '';
  $('formTitle').textContent = 'Add Employee';
  $('saveBtn').textContent = 'Add';
  $('cancelBtn').hidden = true;
}

// CREATE / UPDATE
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = $('empId').value;
  const body = JSON.stringify({
    name: $('name').value,
    email: $('email').value,
    department: $('department').value,
    salary: $('salary').value,
  });
  try {
    if (id) {
      await api(`${API}/${id}`, { method: 'PUT', body });
      show('Employee updated.');
    } else {
      await api(API, { method: 'POST', body });
      show('Employee added.');
    }
    resetForm();
    loadEmployees();
  } catch (err) {
    show(err.message, 'err');
  }
});

// Edit / Delete buttons
$('tbody').addEventListener('click', async (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.del;

  if (editId) {
    try {
      const r = await api(`${API}/${editId}`);
      $('empId').value = r.id;
      $('name').value = r.name;
      $('email').value = r.email;
      $('department').value = r.department;
      $('salary').value = r.salary;
      $('formTitle').textContent = 'Edit Employee #' + r.id;
      $('saveBtn').textContent = 'Update';
      $('cancelBtn').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      show(err.message, 'err');
    }
  }

  if (delId && confirm('Delete this employee?')) {
    try {
      await api(`${API}/${delId}`, { method: 'DELETE' });
      show('Employee deleted.');
      loadEmployees();
    } catch (err) {
      show(err.message, 'err');
    }
  }
});

$('cancelBtn').addEventListener('click', resetForm);

$('search').addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadEmployees, 300);
});

checkDb();
loadEmployees();
