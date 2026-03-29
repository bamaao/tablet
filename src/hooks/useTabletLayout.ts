/**
 * 平板布局断点（与 Android 最小宽度 600dp 平板基准一致）。
 * 本项目在 Manifest 中锁定横屏，典型平板宽度远大于 600。
 */
import {useMemo} from 'react';
import {Platform} from 'react-native';
import {useWindowDimensions} from './useWindowDimensions';

const TABLET_MIN_WIDTH_DP = 600;

export interface TabletLayoutInfo {
  width: number;
  height: number;
  /** 可视宽度 ≥600dp，使用大触控目标与双栏 */
  isTabletLayout: boolean;
  /** 横屏且满足平板宽度（与强制 landscape 一致时的常见形态） */
  isLandscapeTablet: boolean;
  isAndroid: boolean;
}

export function useTabletLayout(): TabletLayoutInfo {
  const {width, height} = useWindowDimensions();
  return useMemo(() => {
    const isTabletLayout = width >= TABLET_MIN_WIDTH_DP;
    return {
      width,
      height,
      isTabletLayout,
      isLandscapeTablet: width >= height && isTabletLayout,
      isAndroid: Platform.OS === 'android',
    };
  }, [width, height]);
}
