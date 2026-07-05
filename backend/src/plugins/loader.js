import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { logger } from '../app.js';
import { prisma } from '../database/index.js';

class PluginLoader {
  constructor() {
    this.plugins = new Map();
  }

  async loadPlugins() {
    const pluginsDir = path.join(process.cwd(), 'src', 'plugins');
    if (!fs.existsSync(pluginsDir)) return;

    const directories = fs.readdirSync(pluginsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

    for (const dir of directories) {
      try {
        const pluginPath = path.join(pluginsDir, dir, 'index.js');
        if (fs.existsSync(pluginPath)) {
          const fileUrl = pathToFileURL(pluginPath).href;
          const { default: plugin } = await import(fileUrl);
          
          if (plugin && plugin.type && plugin.name) {
            this.plugins.set(plugin.type, plugin);
            
            await prisma.plugin.upsert({
              where: { name: plugin.name },
              update: { description: plugin.category },
              create: {
                name: plugin.name,
                description: plugin.category,
                isActive: true
              }
            });
            logger.info(`Loaded plugin: ${plugin.name} (${plugin.type})`);
          }
        }
      } catch (error) {
        logger.error(`Failed to load plugin from ${dir}:`, error);
      }
    }
  }

  getPlugin(type) {
    return this.plugins.get(type);
  }
}

export const pluginLoader = new PluginLoader();
