import path from 'path';

export const dataRoot = process.env.DATA_DIR || process.cwd();

export const dataPath = (...segments) => path.join(dataRoot, ...segments);

