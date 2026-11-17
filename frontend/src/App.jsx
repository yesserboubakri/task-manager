import { useEffect, useState } from 'react';
import * as api from './api.js';

function AuthForm({ onLoggedIn }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      if (mode === 'register') await api.register(email, password);
      const { token } = await api.login(email, password);
      api.setToken(token);
      onLoggedIn();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <form onSubmit={submit} className="card">
      <h1>Task Manager</h1>
      <h2>{mode === 'login' ? 'Log in' : 'Create an account'}</h2>
      <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input type="password" placeholder="Password (min 8 characters)" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="error">{error}</p>}
      <button type="submit">{mode === 'login' ? 'Log in' : 'Register'}</button>
      <button type="button" className="link" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Log in'}
      </button>
    </form>
  );
}

function Tasks({ onLogout }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  async function load() {
    try {
      setTasks(await api.listTasks());
    } catch (err) {
      if (err.status === 401) return onLogout();
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function run(action) {
    setError('');
    try {
      await action();
      await load();
    } catch (err) {
      if (err.status === 401) return onLogout();
      setError(err.message);
    }
  }

  async function add(e) {
    e.preventDefault();
    if (!title.trim()) return;
    await run(() => api.createTask(title));
    setTitle('');
  }

  return (
    <div className="card wide">
      <header>
        <h1>My tasks</h1>
        <button type="button" className="link" onClick={onLogout}>Log out</button>
      </header>

      <form onSubmit={add} className="row">
        <input placeholder="New task" value={title} onChange={(e) => setTitle(e.target.value)} />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            <span className={t.status === 'done' ? 'done' : ''}>{t.title}</span>
            <select value={t.status} onChange={(e) => run(() => api.updateTask(t.id, { status: e.target.value }))}>
              <option value="todo">todo</option>
              <option value="doing">doing</option>
              <option value="done">done</option>
            </select>
            <button type="button" className="danger" onClick={() => run(() => api.deleteTask(t.id))}>Delete</button>
          </li>
        ))}
      </ul>
      {tasks.length === 0 && <p>No tasks yet.</p>}
    </div>
  );
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(Boolean(api.getToken()));

  function logout() {
    api.clearToken();
    setLoggedIn(false);
  }

  return loggedIn ? <Tasks onLogout={logout} /> : <AuthForm onLoggedIn={() => setLoggedIn(true)} />;
}
