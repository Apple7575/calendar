import {handwritingPhotoActions,portraitTurn} from '../lib/handwritingPhoto';

/** Sizes as the picker reports them, after the saved direction is applied. A 12MP sensor is 4032 x 3024. */
const wide={width:4032,height:3024},tall={width:3024,height:4032};

describe('a note photo always comes out as held upright',()=>{
 test('already upright stays untouched',()=>{
  expect(portraitTurn({...tall,exif:{Orientation:6}})).toBe(0);
 });
 test('saved as landscape with the top to the left turns clockwise',()=>{
  expect(portraitTurn({...wide,exif:{Orientation:1}})).toBe(90);
 });
 test('saved as landscape with the top to the right turns the other way',()=>{
  expect(portraitTurn({...wide,exif:{Orientation:3}})).toBe(270);
 });
 test('saved upside down turns over',()=>{
  expect(portraitTurn({...tall,exif:{Orientation:8}})).toBe(180);
 });
 test.each([[undefined],[null],[{}],[{Orientation:'x'}],[{Orientation:2}]])('with no usable direction %j nothing turns',exif=>{
  expect(portraitTurn({...wide,exif})).toBe(0);
  expect(portraitTurn({...tall,exif})).toBe(0);
 });
});

describe('the steps before saving',()=>{
 test('an upright photo under the limit has no steps',()=>{
  expect(handwritingPhotoActions({width:1500,height:2000,exif:{Orientation:6}})).toEqual([]);
 });
 test('an upright large photo shrinks by its height',()=>{
  expect(handwritingPhotoActions({...tall,exif:{Orientation:6}})).toEqual([{resize:{height:2200}}]);
 });
 test('a wide large photo turns first, then shrinks by what is now its height',()=>{
  expect(handwritingPhotoActions({...wide,exif:{Orientation:1}})).toEqual([{rotate:90},{resize:{height:2200}}]);
 });
 test('a wide small photo only turns',()=>{
  expect(handwritingPhotoActions({width:2000,height:1500,exif:{Orientation:3}})).toEqual([{rotate:270}]);
 });
 test('a square photo with no direction is left alone',()=>{
  expect(handwritingPhotoActions({width:1000,height:1000})).toEqual([]);
 });
});

/**
 * A small page moved the way the real steps move it. The sensor is fixed to the phone: raw is what it records of a page
 * read with the phone upright, whichever direction the phone then guesses. Value 6 is that guess being right.
 */
describe('a phone held upright whatever it guessed: the page ends up readable, not upside down',()=>{
 type Grid=string[][];
 const clockwise=(g:Grid):Grid=>g[0].map((_,x)=>g.map(row=>row[x]).reverse());
 const turn=(g:Grid,degrees:number)=>{let out=g;for(let i=0;i<((degrees%360)+360)%360/90;i++)out=clockwise(out);return out};
 /** The EXIF meaning of each value, which the picker bakes into the pixels before the app sees them. */
 const BAKED:Record<number,number>={1:0,3:180,6:90,8:270};
 const raw:Grid=[['c','f'],['b','e'],['a','d']],page:Grid=[['a','b','c'],['d','e','f']];
 const upright=turn(raw,90);
 test('the model agrees: value 6 alone gives the readable page',()=>{
  expect(upright).toEqual(page);
 });
 test.each([[1,'landscape, top to the left'],[3,'landscape, top to the right'],[6,'upright'],[8,'upside down']])('saved direction %i (%s)',orientation=>{
  const seen=turn(raw,BAKED[orientation]),photo={width:seen[0].length*1000,height:seen.length*1000,exif:{Orientation:orientation}};
  expect(turn(seen,portraitTurn(photo))).toEqual(page);
 });
 test('with no value neither landscape side is guessed, so neither can end up upside down',()=>{
  const left=turn(raw,BAKED[1]),right=turn(raw,BAKED[3]),size={width:3000,height:2000};
  expect(turn(left,portraitTurn(size))).toEqual(left);
  expect(turn(right,portraitTurn(size))).toEqual(right);
 });
});

describe('the camera asks for the saved direction',()=>{
 test('the screen requests it and uses these steps',()=>{
  const fs=require('fs'),path=require('path');
  const source=fs.readFileSync(path.join(__dirname,'../features/routine/HandwritingStudy.tsx'),'utf8') as string;
  expect(source).toContain("launchCameraAsync({mediaTypes:['images'],quality:1,exif:true})");
  expect(source).toContain('manipulateAsync(asset.uri,handwritingPhotoActions(asset),');
 });
});
