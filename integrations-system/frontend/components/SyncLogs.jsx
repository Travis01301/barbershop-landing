// Sync Logs Component
import React, { useState, useEffect } from 'react';
import './SyncLogs.css';

export default function SyncLogs({ integrationId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    event_type: 'all',
    status: 'all',
  });
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    loadLogs();
    const interval = setInterval(loadLogs, 30000);
    return () => clearInterval(interval);
  }, [integrationId, filter]);

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.event_type !== 'all') params.append('event_type', filter.event_type);
      if (filter.status !== 'all') params.append('status', filter.status);

      const response = await fetch(
        `/api/logs/${integrationId}?${params.toString()}`,
        {
          headers: {
            'X-Business-ID': sessionStorage.getItem('businessId'),
          },
        }
      );

      if (!response.ok) throw new Error('Failed to load logs');

      const data = await response.json();
      setLogs(data.logs || []);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (logId) => {
    try {
      const response = await fetch(
        `/api/logs/${integrationId}/${logId}/retry`,
        {
          method: 'POST',
        }
      );

      if (response.ok) {
        alert('Retry queued');
        loadLogs();
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) {
    return <div className="sync-logs-loading">Loading logs...</div>;
  }

  return (
    <div className="sync-logs">
      <div className="logs-header">
        <h2>Sync Logs</h2>
        <button className="btn-refresh" onClick={loadLogs}>🔄 Refresh</button>
      </div>

      <div className="logs-filters">
        <select
          value={filter.event_type}
          onChange={(e) => setFilter({ ...filter, event_type: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Event Types</option>
          <option value="sync">Sync</option>
          <option value="auth">Auth</option>
          <option value="webhook">Webhook</option>
          <option value="action">Action</option>
        </select>

        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="filter-select"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="retrying">Retrying</option>
        </select>
      </div>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="logs-empty">
          <p>No logs found</p>
        </div>
      ) : (
        <div className="logs-table">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Event Type</th>
                <th>Action</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr
                    className={`log-row status-${log.status}`}
                    onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                  >
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>{log.event_type}</td>
                    <td>{log.action}</td>
                    <td>
                      <StatusBadge status={log.status} />
                    </td>
                    <td>
                      <button className="btn-expand">
                        {selectedLog?.id === log.id ? '▼' : '▶'}
                      </button>
                    </td>
                  </tr>

                  {selectedLog?.id === log.id && (
                    <tr className="log-details">
                      <td colSpan="5">
                        <div className="log-detail-content">
                          {log.request_data && (
                            <div className="detail-section">
                              <h4>Request Data:</h4>
                              <pre>{JSON.stringify(JSON.parse(log.request_data), null, 2)}</pre>
                            </div>
                          )}

                          {log.response_data && (
                            <div className="detail-section">
                              <h4>Response Data:</h4>
                              <pre>{JSON.stringify(JSON.parse(log.response_data), null, 2)}</pre>
                            </div>
                          )}

                          {log.error_message && (
                            <div className="detail-section error">
                              <h4>Error:</h4>
                              <p>{log.error_message}</p>
                              {log.error_code && <p className="error-code">Code: {log.error_code}</p>}
                              {log.retry_count < 5 && log.status === 'failed' && (
                                <button
                                  className="btn btn-small"
                                  onClick={() => handleRetry(log.id)}
                                >
                                  Retry
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    success: 'green',
    failed: 'red',
    pending: 'yellow',
    retrying: 'orange',
  };

  return (
    <span className={`status-badge status-${colors[status] || 'gray'}`}>
      {status}
    </span>
  );
}
