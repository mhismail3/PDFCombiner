import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui';

const NotFoundPage: React.FC = () => {
  return (
    <div className="py-16 text-center">
      <h2 className="text-4xl font-bold mb-4 dark:text-white">404</h2>
      <h3 className="text-2xl mb-6 dark:text-white">Page Not Found</h3>
      <p className="mb-8 dark:text-gray-300">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link to="/">
        <Button variant="primary" size="large">
          Go to Home
        </Button>
      </Link>
    </div>
  );
};

export default NotFoundPage;
