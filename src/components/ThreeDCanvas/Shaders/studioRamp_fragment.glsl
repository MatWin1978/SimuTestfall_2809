#define saturate( a ) clamp( a, 0.0, 1.0 )

uniform sampler2D hdrTexture;
uniform vec3 gradientColor1;
uniform vec3 gradientColor2;
varying vec2 vUv;
varying vec3 vPosition;
uniform float toneMappingExposure2; 
uniform float offset;
uniform float minY;
uniform float maxY;

//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
//
vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec2 mod289(vec2 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}
vec3 permute(vec3 x) {
    return mod289(((x*34.0)+10.0)*x);
}
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
    0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
    -0.577350269189626,  // -1.0 + 2.0 * C.x
    0.024390243902439); // 1.0 / 41.0
    // First corner
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);

    // Other corners
    vec2 i1;
    //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
    //i1.y = 1.0 - i1.x;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    // x0 = x0 - 0.0 + 0.0 * C.xx ;
    // x1 = x0 - i1 + 1.0 * C.xx ;
    // x2 = x0 - 1.0 + 2.0 * C.xx ;
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    // Permutations
    i = mod289(i); // Avoid truncation effects in permutation
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));

    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m ;
    m = m*m ;

    // Gradients: 41 points uniformly over a line, mapped onto a diamond.
    // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalise gradients implicitly by scaling m
    // Approximation of: m *= inversesqrt( a0*a0 + h*h );
    m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

    // Compute final noise value at P
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

//
//Filmic tone mapping so that the input HDR color is mapped to a more realistic range
vec3 ACESFilmicToneMapping2( vec3 color ) {

    // sRGB => XYZ => D65_2_D60 => AP1 => RRT_SAT
    const mat3 ACESInputMat = mat3(
    vec3( 0.59719, 0.07600, 0.02840 ), // transposed from source
    vec3( 0.35458, 0.90834, 0.13383 ),
    vec3( 0.04823, 0.01566, 0.83777 )
    );

    // ODT_SAT => XYZ => D60_2_D65 => sRGB
    const mat3 ACESOutputMat = mat3(
    vec3(  1.60475, -0.10208, -0.00327 ), // transposed from source
    vec3( -0.53108,  1.10813, -0.07276 ),
    vec3( -0.07367, -0.00605,  1.07602 )
    );

    color *= toneMappingExposure2 / 0.6;

    color = ACESInputMat * color;

    // Apply RRT and ODT
    color = RRTAndODTFit( color );

    color = ACESOutputMat * color;

    // Clamp to [0, 1]
    return saturate( color );

}

void main() {
    //float modifiedV = (vUv.y*-1.0 + 1.0) * vOffset;
    //modifiedV = clamp(modifiedV, 0.0, 1.0);

    //float modifiedV = vPosition.y - vOffset;
    //float modifiedV = (vPosition.y - minY) / (maxY - minY) - offset;
    float modifiedV = ((1.0 - 0.0) / (maxY - minY)) * (vPosition.y - minY) + 0.0;
    modifiedV = clamp(modifiedV, 0.0, 1.0);
    modifiedV = -(cos(3.1415926535897932384626433832795 * modifiedV) - 1.0) / 2.0;
    
    vec3 gradientColor = mix(gradientColor1, gradientColor2, modifiedV);
    vec4 hdrColor = texture2D(hdrTexture, vUv);
    vec3 linearColor = vec3(hdrColor.r, hdrColor.g, hdrColor.b); 
    vec3 toneMappedColor = ACESFilmicToneMapping2(linearColor);
    vec4 finalColor = vec4(toneMappedColor, 1.0) * vec4(gradientColor, 1.0);
    finalColor = finalColor + snoise(vUv*10000.0)*0.03;

    gl_FragColor = finalColor;
}