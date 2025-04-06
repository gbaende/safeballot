import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';

// Define a custom render function type
interface CustomRender {
  (view: string, options?: any, callback?: Function): void;
}

/**
 * Middleware to inject the layout into all EJS views
 * This simulates the functionality of ejs-layouts without the extra dependency
 */
export const ejsLayoutMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Store the original render function
  const originalRender = res.render;
  
  // Override the render function
  res.render = function(view: string, options: any = {}, callback?: Function): void {
    // Read the layout file
    const layoutPath = path.join(__dirname, '../../views/layout.ejs');
    let layoutContent = '';
    
    try {
      layoutContent = fs.readFileSync(layoutPath, 'utf8');
    } catch (err) {
      console.error('Error reading layout file:', err);
      // Pass through to original renderer
      return originalRender.apply(this, [view, options, callback]);
    }
    
    // Use a callback to capture the rendered view
    const renderCallback = (err: Error, html: string) => {
      if (err) {
        if (callback) {
          return callback(err, null);
        }
        throw err;
      }
      
      // Inject the rendered view into the layout
      const layoutWithBody = layoutContent.replace('<%- body %>', html);
      
      // Send the final HTML
      if (callback) {
        return callback(null, layoutWithBody);
      }
      res.send(layoutWithBody);
    };
    
    // Call the original render with our callback
    originalRender.apply(this, [view, options, renderCallback]);
  } as CustomRender;
  
  next();
}; 