import { PrismaClient, SkillSourceType } from '@prisma/client';

export interface SeedMapping {
  sourceType: SkillSourceType;
  ecosystem?: string;
  sourceKey: string;
}

export interface SeedSkill {
  name: string;
  category: string;
  mappings: SeedMapping[];
}

export const SKILL_CATALOG: SeedSkill[] = [
  // ── Programming Languages ──────────────────────────────────────────
  {
    name: 'TypeScript',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'typescript' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'typescript' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'ts' },
    ],
  },
  {
    name: 'JavaScript',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'javascript' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'javascript' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'js' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'es6' },
    ],
  },
  {
    name: 'Python',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'python' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'python' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'python3' },
    ],
  },
  {
    name: 'Java',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'java' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'java' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'jvm' },
    ],
  },
  {
    name: 'C++',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'c++' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'cpp' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'cplusplus' },
    ],
  },
  {
    name: 'C',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'c' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'c' },
    ],
  },
  {
    name: 'C#',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'c#' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'csharp' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'dotnet' },
    ],
  },
  {
    name: 'Go',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'go' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'golang' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'go' },
    ],
  },
  {
    name: 'Rust',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'rust' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'rust' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'rustlang' },
    ],
  },
  {
    name: 'Ruby',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'ruby' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'ruby' },
    ],
  },
  {
    name: 'PHP',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'php' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'php' },
    ],
  },
  {
    name: 'Swift',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'swift' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'swift' },
    ],
  },
  {
    name: 'Kotlin',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'kotlin' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'kotlin' },
    ],
  },
  {
    name: 'Dart',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'dart' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'dart' },
    ],
  },
  {
    name: 'Scala',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'scala' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'scala' },
    ],
  },
  {
    name: 'R',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'r' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'r' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'rstats' },
    ],
  },
  {
    name: 'Shell',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'shell' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'bash' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'shell' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'zsh' },
    ],
  },
  {
    name: 'HTML5',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'html' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'html' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'html5' },
    ],
  },
  {
    name: 'CSS3',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'css' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'css' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'css3' },
    ],
  },
  {
    name: 'SQL',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'sql' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'sql' },
    ],
  },
  {
    name: 'Solidity',
    category: 'Languages',
    mappings: [
      { sourceType: SkillSourceType.LANGUAGE, sourceKey: 'solidity' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'solidity' },
    ],
  },

  // ── Frontend Frameworks & Libraries ────────────────────────────────
  {
    name: 'React',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'react' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'react-dom' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'react' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'reactjs' },
    ],
  },
  {
    name: 'Next.js',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'next' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'nextjs' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'next-js' },
    ],
  },
  {
    name: 'Vue.js',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'vue' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'vue' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'vuejs' },
    ],
  },
  {
    name: 'Nuxt.js',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'nuxt' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'nuxt' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'nuxtjs' },
    ],
  },
  {
    name: 'Angular',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: '@angular/core' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'angular' },
    ],
  },
  {
    name: 'Svelte',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'svelte' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: '@sveltejs/kit' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'svelte' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'sveltekit' },
    ],
  },
  {
    name: 'Tailwind CSS',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'tailwindcss' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'tailwind' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'tailwindcss' },
    ],
  },
  {
    name: 'Redux',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'redux' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: '@reduxjs/toolkit' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'react-redux' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'redux' },
    ],
  },
  {
    name: 'Zustand',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'zustand' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'zustand' },
    ],
  },
  {
    name: 'Vite',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'vite' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'vite' },
    ],
  },
  {
    name: 'Webpack',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'webpack' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'webpack' },
    ],
  },
  {
    name: 'Bootstrap',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'bootstrap' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'bootstrap' },
    ],
  },
  {
    name: 'Material-UI',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: '@mui/material' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: '@material-ui/core' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'material-ui' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'mui' },
    ],
  },
  {
    name: 'Three.js',
    category: 'Frontend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'three' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'threejs' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'webgl' },
    ],
  },

  // ── Backend Frameworks & Runtimes ──────────────────────────────────
  {
    name: 'Node.js',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'nodejs' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'node' },
    ],
  },
  {
    name: 'Express.js',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'express' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'express' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'expressjs' },
    ],
  },
  {
    name: 'NestJS',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: '@nestjs/core' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'nestjs' },
    ],
  },
  {
    name: 'Fastify',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'fastify' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'fastify' },
    ],
  },
  {
    name: 'Django',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'django' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'django' },
    ],
  },
  {
    name: 'Flask',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'flask' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'flask' },
    ],
  },
  {
    name: 'FastAPI',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'fastapi' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'fastapi' },
    ],
  },
  {
    name: 'Spring Boot',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'maven', sourceKey: 'spring-boot' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'maven', sourceKey: 'org.springframework.boot' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'spring-boot' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'spring' },
    ],
  },
  {
    name: 'ASP.NET',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'aspnet' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'aspnetcore' },
    ],
  },
  {
    name: 'Ruby on Rails',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'rails' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'rubyonrails' },
    ],
  },
  {
    name: 'Laravel',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'laravel' },
    ],
  },
  {
    name: 'Gin',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'gin' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'gin-gonic' },
    ],
  },

  // ── Databases & ORMs ───────────────────────────────────────────────
  {
    name: 'PostgreSQL',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'pg' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'psycopg2' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'psycopg2-binary' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'postgres' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'postgresql' },
    ],
  },
  {
    name: 'MySQL',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'mysql2' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'mysql' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'mysqlclient' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'mysql' },
    ],
  },
  {
    name: 'MongoDB',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'mongodb' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'mongoose' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'pymongo' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'mongodb' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'mongo' },
    ],
  },
  {
    name: 'Redis',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'redis' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'ioredis' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'redis' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'redis' },
    ],
  },
  {
    name: 'SQLite',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'sqlite3' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'better-sqlite3' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'sqlite' },
    ],
  },
  {
    name: 'Prisma',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'prisma' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: '@prisma/client' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'prisma' },
    ],
  },
  {
    name: 'TypeORM',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'typeorm' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'typeorm' },
    ],
  },
  {
    name: 'SQLAlchemy',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'sqlalchemy' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'sqlalchemy' },
    ],
  },
  {
    name: 'Mongoose',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'mongoose' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'mongoose' },
    ],
  },
  {
    name: 'Supabase',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: '@supabase/supabase-js' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'supabase' },
    ],
  },
  {
    name: 'Firebase',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'firebase' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'firebase-admin' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'firebase' },
    ],
  },
  {
    name: 'Elasticsearch',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: '@elastic/elasticsearch' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'elasticsearch' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'elasticsearch' },
    ],
  },
  {
    name: 'Neo4j',
    category: 'Databases',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'neo4j-driver' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'neo4j' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'neo4j' },
    ],
  },

  // ── AI, Machine Learning & Data Science ─────────────────────────────
  {
    name: 'NumPy',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'numpy' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'numpy' },
    ],
  },
  {
    name: 'Pandas',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'pandas' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'pandas' },
    ],
  },
  {
    name: 'Scikit-learn',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'scikit-learn' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'sklearn' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'scikit-learn' },
    ],
  },
  {
    name: 'TensorFlow',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'tensorflow' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'tensorflow' },
    ],
  },
  {
    name: 'PyTorch',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'torch' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'torchvision' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'pytorch' },
    ],
  },
  {
    name: 'Keras',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'keras' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'keras' },
    ],
  },
  {
    name: 'OpenCV',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'opencv-python' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'cv2' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'opencv' },
    ],
  },
  {
    name: 'Matplotlib',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'matplotlib' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'matplotlib' },
    ],
  },
  {
    name: 'Seaborn',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'seaborn' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'seaborn' },
    ],
  },
  {
    name: 'Transformers',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'transformers' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'transformers' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'huggingface' },
    ],
  },
  {
    name: 'LangChain',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'langchain' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'langchain' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'langchain' },
    ],
  },
  {
    name: 'Machine Learning',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'machine-learning' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'ml' },
    ],
  },
  {
    name: 'Deep Learning',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'deep-learning' },
    ],
  },
  {
    name: 'Computer Vision',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'computer-vision' },
    ],
  },
  {
    name: 'Natural Language Processing',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'nlp' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'natural-language-processing' },
    ],
  },
  {
    name: 'Artificial Intelligence',
    category: 'Data Science & AI',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'artificial-intelligence' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'ai' },
    ],
  },

  // ── Mobile & Cross-Platform ────────────────────────────────────────
  {
    name: 'Android',
    category: 'Mobile',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'android' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'android-app' },
    ],
  },
  {
    name: 'iOS',
    category: 'Mobile',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'ios' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'ios-app' },
    ],
  },
  {
    name: 'React Native',
    category: 'Mobile',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'react-native' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'react-native' },
    ],
  },
  {
    name: 'Flutter',
    category: 'Mobile',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'flutter' },
    ],
  },
  {
    name: 'Expo',
    category: 'Mobile',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'expo' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'expo' },
    ],
  },

  // ── DevOps & Cloud ─────────────────────────────────────────────────
  {
    name: 'Docker',
    category: 'DevOps & Cloud',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'docker' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'dockerfile' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'containerization' },
    ],
  },
  {
    name: 'Kubernetes',
    category: 'DevOps & Cloud',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'kubernetes' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'k8s' },
    ],
  },
  {
    name: 'AWS',
    category: 'DevOps & Cloud',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'aws-sdk' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'boto3' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'aws' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'amazon-web-services' },
    ],
  },
  {
    name: 'Google Cloud',
    category: 'DevOps & Cloud',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: '@google-cloud/storage' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'google-cloud-storage' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'gcp' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'google-cloud' },
    ],
  },
  {
    name: 'Microsoft Azure',
    category: 'DevOps & Cloud',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'azure' },
    ],
  },
  {
    name: 'Linux',
    category: 'DevOps & Cloud',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'linux' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'ubuntu' },
    ],
  },
  {
    name: 'Git',
    category: 'DevOps & Cloud',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'git' },
    ],
  },
  {
    name: 'GitHub Actions',
    category: 'DevOps & Cloud',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'github-actions' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'ci-cd' },
    ],
  },
  {
    name: 'Nginx',
    category: 'DevOps & Cloud',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'nginx' },
    ],
  },
  {
    name: 'Terraform',
    category: 'DevOps & Cloud',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'terraform' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'iac' },
    ],
  },
  {
    name: 'GraphQL',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'graphql' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: '@apollo/server' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'graphql' },
    ],
  },
  {
    name: 'REST API',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'rest-api' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'api' },
    ],
  },
  {
    name: 'WebSockets',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'ws' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'socket.io' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'websocket' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'websockets' },
    ],
  },
  {
    name: 'Microservices',
    category: 'Backend',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'microservices' },
    ],
  },

  // ── Testing & QA ───────────────────────────────────────────────────
  {
    name: 'Jest',
    category: 'Testing',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'jest' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'jest' },
    ],
  },
  {
    name: 'Vitest',
    category: 'Testing',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'vitest' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'vitest' },
    ],
  },
  {
    name: 'Cypress',
    category: 'Testing',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'cypress' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'cypress' },
    ],
  },
  {
    name: 'Playwright',
    category: 'Testing',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'playwright' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: '@playwright/test' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'playwright' },
    ],
  },
  {
    name: 'PyTest',
    category: 'Testing',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'pytest' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'pytest' },
    ],
  },
  {
    name: 'JUnit',
    category: 'Testing',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'maven', sourceKey: 'junit' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'maven', sourceKey: 'org.junit.jupiter' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'junit' },
    ],
  },

  // ── Cybersecurity & Web3 ───────────────────────────────────────────
  {
    name: 'Cybersecurity',
    category: 'Security',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'cybersecurity' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'security' },
    ],
  },
  {
    name: 'Cryptography',
    category: 'Security',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'pip', sourceKey: 'cryptography' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'cryptography' },
    ],
  },
  {
    name: 'Blockchain',
    category: 'Web3',
    mappings: [
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'blockchain' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'web3' },
    ],
  },
  {
    name: 'Ethereum',
    category: 'Web3',
    mappings: [
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'ethers' },
      { sourceType: SkillSourceType.DEPENDENCY, ecosystem: 'npm', sourceKey: 'web3' },
      { sourceType: SkillSourceType.TOPIC, sourceKey: 'ethereum' },
    ],
  },
];

export async function seedSkills(prisma: PrismaClient): Promise<{ skillsCount: number; mapsCount: number }> {
  console.log(`⚡ Seeding Skill Catalog (${SKILL_CATALOG.length} skills)...`);

  await prisma.skill.createMany({
    data: SKILL_CATALOG.map((skill) => ({
      name: skill.name,
      category: skill.category,
      isActive: true,
    })),
    skipDuplicates: true,
  });

  const allSkills = await prisma.skill.findMany({ select: { id: true, name: true } });
  const skillMap = new Map(allSkills.map((s) => [s.name, s.id]));

  const mappingsToInsert: Array<{
    skillId: string;
    sourceType: SkillSourceType;
    ecosystem: string | null;
    sourceKey: string;
  }> = [];

  for (const skill of SKILL_CATALOG) {
    const skillId = skillMap.get(skill.name);
    if (!skillId) continue;
    for (const m of skill.mappings) {
      mappingsToInsert.push({
        skillId,
        sourceType: m.sourceType,
        ecosystem: m.ecosystem || null,
        sourceKey: m.sourceKey.toLowerCase(),
      });
    }
  }

  const result = await prisma.skillSourceMap.createMany({
    data: mappingsToInsert,
    skipDuplicates: true,
  });

  console.log(`  ✓ Skills ready: ${SKILL_CATALOG.length} verified in catalog`);
  console.log(`  ✓ SkillSourceMap entries added (new): ${result.count}`);

  return { skillsCount: SKILL_CATALOG.length, mapsCount: mappingsToInsert.length };
}
