import React from 'react';
import { Card } from '../components/ui';

const AboutPage: React.FC = () => {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 dark:text-white">About PDF Combiner</h2>

      <Card className="mb-6">
        <h3 className="text-xl font-semibold mb-3 dark:text-white">What is PDF Combiner?</h3>
        <p className="mb-4 dark:text-gray-300">
          PDF Combiner is a clean, browser-based tool that lets you easily merge multiple PDF files
          into a single document with precise control over page selection and ordering.
        </p>
        <p className="mb-4 dark:text-gray-300">
          Our tool processes your files directly in the browser using WebAssembly technology,
          ensuring your documents never leave your device unless you choose to use our optional
          serverless processing for very large files.
        </p>
      </Card>

      <Card>
        <h3 className="text-xl font-semibold mb-3 dark:text-white">Key Features</h3>
        <ul className="list-disc pl-5 space-y-2 dark:text-gray-300">
          <li>Drag-and-drop or file browser upload</li>
          <li>Visual preview of all PDF pages</li>
          <li>Select specific pages to include/exclude</li>
          <li>Reorder pages with intuitive drag gestures</li>
          <li>Client-side processing for privacy</li>
          <li>Download or generate shareable links (24-hour expiration)</li>
          <li>Dark mode support</li>
          <li>Responsive design for all devices</li>
        </ul>
      </Card>
    </div>
  );
};

export default AboutPage;
