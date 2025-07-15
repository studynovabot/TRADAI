// Global type declarations for modules without built-in TypeScript support

declare module 'lucide-react' {
  import { FC, SVGProps } from 'react';
  
  export interface LucideProps extends SVGProps<SVGSVGElement> {
    size?: string | number;
    color?: string;
    strokeWidth?: string | number;
  }
  
  export type LucideIcon = FC<LucideProps>;
  
  export const Activity: LucideIcon;
  export const Brain: LucideIcon;
  export const Clock: LucideIcon;
  export const Rocket: LucideIcon;
  export const Settings: LucideIcon;
  export const Target: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const Zap: LucideIcon;
}

declare module 'technicalindicators' {
  export interface RSIInput {
    values: number[];
    period: number;
  }

  export interface MACDInput {
    values: number[];
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
    SimpleMAOscillator?: boolean;
    SimpleMASignal?: boolean;
  }

  export interface EMAInput {
    values: number[];
    period: number;
  }

  export interface BollingerBandsInput {
    values: number[];
    period: number;
    stdDev?: number;
  }

  export interface MACDOutput {
    MACD: number;
    signal: number;
    histogram: number;
  }

  export interface BollingerBandsOutput {
    upper: number;
    middle: number;
    lower: number;
    pb: number;
    bandwidth: number;
  }

  export class RSI {
    static calculate(input: RSIInput): number[];
  }

  export class MACD {
    static calculate(input: MACDInput): MACDOutput[];
  }

  export class EMA {
    static calculate(input: EMAInput): number[];
  }

  export class BollingerBands {
    static calculate(input: BollingerBandsInput): BollingerBandsOutput[];
  }
}