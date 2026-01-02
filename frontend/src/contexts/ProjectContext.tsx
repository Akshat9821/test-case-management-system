import React, { createContext, useContext, useState, useCallback } from 'react';

interface Project {
  id: number;
  name: string;
  description?: string;
  version?: string;
  status: string;
}

interface ProjectContextType {
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(
    JSON.parse(localStorage.getItem('currentProject') || 'null')
  );

  const handleSetProject = useCallback((project: Project | null) => {
    setCurrentProject(project);
    if (project) {
      localStorage.setItem('currentProject', JSON.stringify(project));
    } else {
      localStorage.removeItem('currentProject');
    }
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        setCurrentProject: handleSetProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};


