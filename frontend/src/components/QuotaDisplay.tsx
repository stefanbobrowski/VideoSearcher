import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import styles from './QuotaDisplay.module.scss';

const QuotaDisplay: React.FC = () => {
  const { quota, user, logout } = useAuth();

  if (!quota) return null;

  const percentage = (quota.remaining / quota.total) * 100;
  const resetDate = new Date(quota.resetAt);
  const timeUntilReset = resetDate.getTime() - Date.now();
  const hoursUntilReset = Math.floor(timeUntilReset / (1000 * 60 * 60));

  return (
    <div className={styles.quotaDisplay}>
      <div className={styles.header}>
        <div className={styles.userInfo}>
          <span className={styles.email}>👤 {user?.email}</span>
        </div>
        <button type="button" onClick={logout} className={styles.logoutBtn}>
          Logout
        </button>
      </div>

      <div className={styles.quotaInfo}>
        <div className={styles.quotaText}>
          <strong>{quota.remaining}</strong> of <strong>{quota.total}</strong> requests remaining
          today
        </div>

        <div className={styles.progressBar}>
          <div
            className={styles.progressFill}
            style={{
              width: `${percentage}%`,
              background: percentage > 50 ? '#4caf50' : percentage > 20 ? '#ff9800' : '#f44336',
            }}
          />
        </div>

        <div className={styles.resetInfo}>Resets in ~{hoursUntilReset} hours</div>
      </div>
    </div>
  );
};

export default QuotaDisplay;
