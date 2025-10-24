export const coveragePolicies = {
  backend: {
    label: 'Backend API',
    thresholds: {
      statements: 0.8,
      branches: 0.75,
      functions: 0.8,
      lines: 0.8
    }
  },
  frontend: {
    label: 'Frontend Web',
    thresholds: {
      statements: 0.85,
      branches: 0.8,
      functions: 0.85,
      lines: 0.85
    }
  },
  flutter: {
    label: 'Flutter Mobile',
    thresholds: {
      statements: 0.7,
      branches: 0.65,
      functions: 0.75,
      lines: 0.7
    }
  }
};

export const coverageTargets = [
  {
    id: 'backend',
    label: coveragePolicies.backend.label,
    format: 'vitest-summary',
    relativePath: 'backend-nodejs/coverage/coverage-summary.json'
  },
  {
    id: 'frontend',
    label: coveragePolicies.frontend.label,
    format: 'vitest-summary',
    relativePath: 'frontend-reactjs/coverage/coverage-summary.json'
  },
  {
    id: 'flutter',
    label: coveragePolicies.flutter.label,
    format: 'lcov',
    relativePath: 'Edulure-Flutter/coverage/lcov.info'
  }
];

export const manualQaPolicies = {
  evidence: {
    requiredArtifacts: ['screenshots', 'coverage-matrix', 'test-report'],
    storageDirectory: 'qa/reports'
  },
  checklist: {
    defaultPath: 'qa/release/core_release_checklist.json',
    slug: 'core-release-readiness',
    evidenceField: 'evidence'
  }
};
