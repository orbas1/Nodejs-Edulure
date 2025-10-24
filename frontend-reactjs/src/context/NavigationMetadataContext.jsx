import PropTypes from 'prop-types';
import { createContext, useContext, useMemo } from 'react';

import {
  mapNavigationToInitiatives,
  buildOperationalChecklist,
  collectDesignDependencies,
  collectStrategyNarratives,
  collectProductBacklog
} from '../navigation/metadata.js';

const defaultValue = {
  initiatives: { primary: [], quickActions: [], dashboard: [] },
  operationsChecklist: [],
  designDependencies: { tokens: [], qa: [], references: [] },
  strategyNarratives: [],
  productBacklog: []
};

const NavigationMetadataContext = createContext(defaultValue);

export function NavigationMetadataProvider({ role, children }) {
  const value = useMemo(() => {
    return {
      initiatives: mapNavigationToInitiatives(role),
      operationsChecklist: buildOperationalChecklist(role),
      designDependencies: collectDesignDependencies(role),
      strategyNarratives: collectStrategyNarratives(role),
      productBacklog: collectProductBacklog(role)
    };
  }, [role]);

  return <NavigationMetadataContext.Provider value={value}>{children}</NavigationMetadataContext.Provider>;
}

NavigationMetadataProvider.propTypes = {
  role: PropTypes.string,
  children: PropTypes.node.isRequired
};

NavigationMetadataProvider.defaultProps = {
  role: 'learner'
};

export function useNavigationMetadata() {
  return useContext(NavigationMetadataContext);
}

