import * as THREE from 'three';
import { runBenchmark } from './utils.js';
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree, CENTER, AVERAGE, SAH, estimateMemoryInBytes, getBVHExtremes } from '../src/index.js';

THREE.Mesh.prototype.raycast = acceleratedRaycast;
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

const sphere = new THREE.Sphere( undefined, 3 );
const boxMat = new THREE.Matrix4().identity();
const box = new THREE.Box3();
box.min.set( - 1, - 1, - 1 );
box.min.set( 1, 1, 1 );

const intersectGeometry = new THREE.TorusBufferGeometry( 5, 5, 100, 50 );
const geomMat = new THREE.Matrix4().compose( new THREE.Vector3(), new THREE.Quaternion(), new THREE.Vector3( 0.1, 0.1, 0.1 ) );

const target1 = new THREE.Vector3();
const target2 = new THREE.Vector3();

const geometry = new THREE.TorusBufferGeometry( 5, 5, 700, 300 );
const mesh = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial() );
const raycaster = new THREE.Raycaster();
raycaster.ray.origin.set( 0, 0, - 10 );
raycaster.ray.direction.set( 0, 0, 1 );

function logExtremes( bvh ) {

	const bvhSize = estimateMemoryInBytes( bvh._roots );
	const serializedSize = estimateMemoryInBytes( bvh.serialize().roots );

	const extremes = getBVHExtremes( bvh )[ 0 ];
	console.log(
		`\tExtremes:\n` +
		`\t\tmemory: ${ bvhSize / 1000 } kb\n` +
		`\t\tserialized: ${ serializedSize / 1000 } kb\n` +
		`\t\ttris: ${extremes.tris.min}, ${extremes.tris.max}\n` +
		`\t\tdepth: ${extremes.depth.min}, ${extremes.depth.max}\n` +
		`\t\tsplits: ${extremes.splits[ 0 ]}, ${extremes.splits[ 1 ]}, ${extremes.splits[ 2 ]}\n`
	);

}

function runSuite( strategy ) {

	geometry.computeBoundsTree( { strategy: strategy } );
	logExtremes( geometry.boundsTree );

	runBenchmark(

		'Compute BVH',
		() => {

			geometry.computeBoundsTree( { strategy: strategy } );
			geometry.boundsTree = null;

		},
		3000,
		50

	);

	geometry.computeBoundsTree( { strategy: strategy } );
	runBenchmark(

		'Serialize',
		() => {

			geometry.boundsTree.serialize();

		},
		3000,
		50

	);

	const serialized = geometry.boundsTree.serialize();
	runBenchmark(

		'Deserialize',
		() => {

			geometry.boundsTree.deserialize( serialized );

		},
		3000,
		50

	);

	geometry.computeBoundsTree( { strategy: strategy } );
	raycaster.firstHitOnly = false;
	runBenchmark(

		'BVH Raycast',
		() => mesh.raycast( raycaster, [] ),
		3000

	);

	raycaster.firstHitOnly = true;
	runBenchmark(

		'First Hit Raycast',
		() => mesh.raycast( raycaster, [] ),
		3000

	);

	console.log( '' );

	runBenchmark(

		'IntersectsSphere',
		() => mesh.geometry.boundsTree.intersectsSphere( mesh, sphere ),
		3000

	);

	runBenchmark(

		'IntersectsBox',
		() => mesh.geometry.boundsTree.intersectsBox( mesh, box, boxMat ),
		3000

	);

	runBenchmark(

		'DistanceToGeometry',
		() => mesh.geometry.boundsTree.closestPointToGeometry( mesh, intersectGeometry, geomMat, target1, target2 ),
		3000

	);

	const vec = new THREE.Vector3();
	runBenchmark(

		'DistanceToPoint',
		() => mesh.geometry.boundsTree.closestPointToPoint( mesh, vec, target1 ),
		3000

	);

	console.log( '' );

	intersectGeometry.computeBoundsTree( { strategy: strategy } );
	runBenchmark(

		'IntersectsGeometry with BVH',
		() => mesh.geometry.boundsTree.intersectsGeometry( mesh, intersectGeometry, geomMat ),
		3000

	);


	intersectGeometry.disposeBoundsTree();
	runBenchmark(

		'IntersectsGeometry without BVH',
		() => mesh.geometry.boundsTree.intersectsGeometry( mesh, intersectGeometry, geomMat ),
		3000

	);

}


console.log( '*Strategy: CENTER*' );
runSuite( CENTER );

console.log( '' );
console.log( '*Strategy: AVERAGE*' );
runSuite( AVERAGE );

console.log( '' );
console.log( '*Strategy: SAH*' );
runSuite( SAH );

//

console.log( '' );
console.log( '*Strategy: NONE*' );

geometry.boundsTree = null;
raycaster.firstHitOnly = false;
runBenchmark(

	'Default Raycast',
	() => mesh.raycast( raycaster, [] ),
	3000

);


console.log( '' );

console.log( 'Extreme Case Tower Geometry' );

const towerGeometry = new THREE.PlaneBufferGeometry( 10, 10, 400, 400 );
const posAttr = towerGeometry.getAttribute( 'position' );
for ( let x = 0; x <= 100; x ++ ) {

	for ( let y = 0; y <= 100; y ++ ) {

		const inCenter = x > 100 && x < 300 && y > 100 && y < 300;
		const i = x * 100 + y;
		const z = inCenter ? 50 : - 50;
		posAttr.setZ( i, z + x * 0.01 );

	}

}

raycaster.firstHitOnly = false;
raycaster.ray.origin.set( 100, 100, 100 );
raycaster.ray.direction.set( - 1, - 1, - 1 );
mesh.geometry = towerGeometry;

towerGeometry.computeBoundsTree( { strategy: CENTER } );
runBenchmark(

	'CENTER raycast',
	() => mesh.raycast( raycaster ),
	3000

);
logExtremes( towerGeometry.boundsTree );

towerGeometry.computeBoundsTree( { strategy: AVERAGE } );
runBenchmark(

	'AVERAGE raycast',
	() => mesh.raycast( raycaster ),
	3000

);
logExtremes( towerGeometry.boundsTree );

towerGeometry.computeBoundsTree( { strategy: SAH } );
runBenchmark(

	'SAH raycast',
	() => mesh.raycast( raycaster ),
	3000

);
logExtremes( towerGeometry.boundsTree );
