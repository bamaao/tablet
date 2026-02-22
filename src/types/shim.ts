/**
 * Type declarations for third-party libraries
 */

declare module 'react-native-vector-icons' {
  import * as React from 'react';
  import {ImageSourcePropType} from 'react-native';

  export interface IconProps {
    name: string;
    size?: number;
    color?: string | number;
    style?: any;
  }

  export default class Icon extends React.Component<IconProps> {}
}

declare module 'react-native-gesture-handler' {
  export const ScrollView: any;
  export const GestureDetector: any;
  export const Gesture: any;
}

declare module 'react-native-reanimated' {
  export const FadeIn: any;
  export const FadeOut: any;
  export const SlideInDown: any;
  export const SlideOutDown: any;
}

declare const Button: any;
