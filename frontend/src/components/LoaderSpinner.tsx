import React from 'react';
import styles from './LoaderSpinner.module.scss';

const LoaderSpinner: React.FC = () => (
  <div className={styles.loaderSpinner} aria-label="Loading">
    <div className={styles.spinner} />
  </div>
);

export default LoaderSpinner;
