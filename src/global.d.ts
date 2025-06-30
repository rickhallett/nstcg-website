// global.d.ts
declare function describe(name: string, callback: () => void): void;
declare function it(description: string, callback: () => void): void;
declare namespace it {
    function only(description: string, callback: () => void): void;
    function skip(description: string, callback: () => void): void;
}
declare function beforeEach(callback: () => void): void;
declare function afterEach(callback: () => void): void;
declare function expect(actual: any): any;
declare function createMock(methods?: string[]): any;
declare function run(): void;
