/**
 * Register Handlebars helpers needed by widgets
 * Following fail-fast design - throws immediately if Handlebars missing
 */

if (typeof window !== 'undefined') {
  // Wait for Handlebars to be available
  const registerHelpers = () => {
    if (!window.Handlebars) {
      throw new Error('Handlebars not available - check CDN loading order');
    }

    // Equality helper for conditionals
    window.Handlebars.registerHelper('eq', function(a, b) {
      return a === b;
    });

    // Not equal helper
    window.Handlebars.registerHelper('neq', function(a, b) {
      return a !== b;
    });

    // Event binding helper for widget events
    window.Handlebars.registerHelper('on', function(event, method) {
      return new window.Handlebars.SafeString(`data-${event}="${method}"`);
    });

    // Loop index helper
    window.Handlebars.registerHelper('inc', function(value) {
      return parseInt(value) + 1;
    });

    // Debug helper
    window.Handlebars.registerHelper('debug', function(context) {
      console.log('[Handlebars Debug]', context);
      return '';
    });

    console.log('[Widget] Handlebars helpers registered');
  };

  // Register helpers when Handlebars is ready
  if (window.Handlebars) {
    registerHelpers();
  } else {
    // Wait for Handlebars to load
    const checkHandlebars = () => {
      if (window.Handlebars) {
        registerHelpers();
      } else {
        setTimeout(checkHandlebars, 50);
      }
    };
    checkHandlebars();
  }
}