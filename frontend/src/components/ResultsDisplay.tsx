import React from 'react';
import styles from './ResultsDisplay.module.scss';

interface ResultsDisplayProps {
  results: string[];
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ results }) => {
  if (!results.length) return null;
  return (
    <div className={styles.resultsDisplay}>
      <h2>Results</h2>
      <ul>
        {results.map((timestamp, idx) => (
          <li key={idx}>{timestamp}</li>
        ))}
      </ul>
    </div>
  );
};

export default ResultsDisplay;
