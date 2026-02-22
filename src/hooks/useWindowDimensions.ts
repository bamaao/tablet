/**
 * useWindowDimensions Hook
 *
 * A custom hook to get window dimensions with proper typing
 */

import {useWindowDimensions as useRNWindowDimensions} from 'react-native';

export interface WindowDimensions {
  width: number;
  height: number;
  scale: number;
  fontScale: number;
}

export const useWindowDimensions = (): WindowDimensions => {
  return useRNWindowDimensions();
};

export default useWindowDimensions;
