// Re-export importLibrary so Navbar and other components don't need to
// know about @googlemaps/js-api-loader directly.
// setOptions is handled by PhillyMap (which always mounts before any
// component tries to use the Maps API).
export { importLibrary } from '@googlemaps/js-api-loader';
