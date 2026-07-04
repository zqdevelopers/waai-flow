const getPathValue = (source, path) => {
  const value = String(path || '').trim();
  if (!value) return '';
  return value.split('.').reduce((current, key) => {
    if (current === null || current === undefined) return undefined;
    return current[key];
  }, source);
};

const stringifyTemplateValue = (value) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const renderFlowTemplate = (template = '', variables = {}) => (
  String(template).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, key) => stringifyTemplateValue(getPathValue(variables, key)))
);

