import * as THREE from '../../build/three.module.js';

export function sub(a, b) {
    let ab = a.clone();
    ab.sub(b);
    return ab;
}

export function dot(a, b) {
    return a.dot(b);
}

export function add(a, b) {
    let ab = a.clone();
    ab.add(b);
    return ab;
}


export function smul(t, v) {
    let v_ = v.clone();
    v_.multiplyScalar(t);
    return v_;
}

export function cross(u1_, u2_) {
    let u1 = u1_.clone();
    let u2 = u2_.clone();
    let axis = u1.clone();
    axis.cross(u2);
    return axis;
}

export function rotateAlignNaive(u1_, u2_) {
    let a = [u1_.x, u1_.y, u1_.z];
    let b = [u2_.x, u2_.y, u2_.z];
    a = math.divide(a, math.norm(a));
    b = math.divide(b, math.norm(b));

    let v = math.cross(a, b);
    let s = math.dot(v, v);
    let c = math.dot(a, b);
    let v3 = (1 - c)/s;

    let I = math.identity(3);
    let vx = math.matrix([
        [0, -v[2], v[1]],
        [v[2], 0, -v[0]],
        [-v[1], v[0], 0]]);

    let R = math.add(math.add(I, vx), math.multiply(v3, vx));
    if (math.norm(v) <= 1e-7) {
       R = I;
    }
    let RT = new THREE.Matrix3();
    RT.set(R.get([0,0]), R.get([0,1]), R.get([0,2]), R.get([1,0]), R.get([1,1]), R.get([1,2]), R.get([2,0]), R.get([2,1]), R.get([2,2]));
    return RT;
}

export function segSegShortestDist(p1, p2, p3, p4) {
    // 2. create a plane with the normal being the direction of the segment and the
    //    starting point being the start of the segment
    let nPlane = sub(p2, p1);
    let pPlane = p1;
    // 3. project the other segment onto this plane
    //    now we reduced the problem to a simple point to segment distance problem
    let p3_ = projectToPlane(nPlane, pPlane, p3);
    let p4_ = projectToPlane(nPlane, pPlane, p4);
    // 4. we calculate that distance
    // now p1 and the line segment p4_, p3_ lie in the same plane
    // which means all we have to do is project the point p1 onto the line segment e34_
    // this gives us lambda
    let e34_ = sub(p4_, p3_);
    let lambda = 0.5;
    if (e34_.dot(e34_) > 1e-7) { // check if not parallel
        lambda = sub(p1, p3_).dot(e34_) / e34_.dot(e34_);
    }
    // the point calculated is now on the "line" if there was any
    lambda = clamp01(lambda);
    let p34_line = add(p3, smul(lambda, sub(p4, p3)));
    // so we project it normally back to the line segment
    // to be really accurate we have to project the point first on the segment 1,2
    let p12_seg = projectToSegment(p34_line, p1, p2);
    // and now also this point onto the segment 3,4
    // and now also project this normally to the other line segment
    let p34_seg = projectToSegment(p12_seg, p3, p4);
    return [p12_seg, p34_seg]
}

export function clamp(t, mini, maxi) {
    if (t > maxi)
        return maxi
    if (t < mini)
        return mini;
    return t;
}

export function pointToRectangle_rOrtho(r0, r1, r2,r3, q) {
    const r = r0;

    let u1 = sub(r1, r0);
    let u2 = sub(r3, r0);

    let ext1 = u1.length();
    let ext2 = u2.length();

    u1.normalize();
    u2.normalize();

    let diff = sub(q, r);
    let s = clamp(u1.dot(diff), 0, ext1);
    let t = clamp(u2.dot(diff), 0, ext2);

    return add(add(r, smul(s, u1)), smul(t, u2));
}

export function pointToRectangle(p0, p1, p2, q) {
    const p = p0;

    // first calculate the plane directions
    let u1 = sub(p1, p0);
    let u2_ = sub(p2, p0);

    // calculate the dimensions
    let ext1 = u1.length();
    let ext2 = u2_.length();

    u1.normalize();
    u2_.normalize();

    // calculate the normal
    let nNormal = cross(u1, u2_);
    let u2 = cross(u1, nNormal);

    // check if we have to turn u2 because it could point into the wrong direction
    if (sub(add(p, u2), p2).length() > sub(add(p, u2.clone().negate()), p2).length()) {
        u2.negate();
    }

    // this is the "meat" on how to project the points onto the rectangle
    // the dot product tells us where the position is relative to the plane directions
    let diff = sub(q, p);
    let s = clamp(u1.dot(diff), 0, ext1);
    let t = clamp(u2.dot(diff), 0, ext2);

    // r(s,t) = p + s*u1 + t*u2
    return add(add(p, smul(s, u1)), smul(t, u2));
}

export function getRectanglePoints(p1, p2, p3) {
    let u1 = sub(p2, p1);
    let u2_ = sub(p3, p1);

    let ext1 = u1.length();
    let ext2 = u2_.length();

    u1.normalize();
    u2_.normalize();

    let nNormal = cross(u1, u2_);
    let u2 = cross(u1, nNormal);
    u2.normalize();

    u1 = smul(ext1, u1);
    u2 = smul(ext2, u2);

    // check if we have to turn u2 because it could point into the wrong direction
    if (sub(add(p1, u2), p3).length() > sub(add(p1, u2.clone().negate()), p3).length()) {
        u2.negate();
    }

    let v1 = p1;
    let v2 = add(p1, u1);
    let v3 = add(p1, u2);
    let v4 = add(v3, u1);

    return [v1, v2, v3, v4];
}

export function shortestDistanceRectangleSegment_rOrtho(r1, r2, r3, r4, s1, s2) {
    let s1_proj = pointToRectangle_rOrtho(r1, r2, r3, r4, s1);
    let s2_proj = pointToRectangle_rOrtho(r1, r2, r3, r4, s2);


    let res = segSegShortestDist(s1, s2, s1_proj, s2_proj);
    let min_dist = sub(res[0], res[1]).length();
    let min_p1 = res[0];
    let min_p2 = res[1];

    res = segSegShortestDist(s1, s2, r1, r2);
    let dist = sub(res[0], res[1]);
    if (dist < min_dist) {
        min_dist = dist;
        min_p1 = res[0];
        min_p2 = res[1];
    }

    res = segSegShortestDist(s1, s2, r2, r3);
    dist = sub(res[0], res[1]);
    if (dist < min_dist) {
        min_dist = dist;
        min_p1 = res[0];
        min_p2 = res[1];
    }

    res = segSegShortestDist(s1, s2, r3, r4);
    dist = sub(res[0], res[1]);
    if (dist < min_dist) {
        min_dist = dist;
        min_p1 = res[0];
        min_p2 = res[1];
    }

    res = segSegShortestDist(s1, s2, r4, r1);
    dist = sub(res[0], res[1]);
    if (dist < min_dist) {
        min_dist = dist;
        min_p1 = res[0];
        min_p2 = res[1];
    }

    return [min_p1, min_p2, min_dist];
}

export function worldToLocal(p, R, q_) {
    let q = q_.clone();
    return sub(q, p).applyMatrix3(R.clone().transpose());
}

export function localToWorld(p, R, q_) {
    let q = q_.clone();
    return add(p, q.applyMatrix3(R));
}

export function calcShortestDistance(p,R, dims, s1_, s2_) {
    // 1. translate world point to rectangle local points
    let s1 = worldToLocal(p, R, s1_);
    let s2 = worldToLocal(p, R, s2_);

    // 2. create orthogonal vectors that make up the box
    // we calculate shortest distance to
    // dims = [width, height, depth] => x, y, z
    let u1 = smul(dims[0],  new THREE.Vector3(1, 0 , 0));
    let u2 = smul(dims[1], new THREE.Vector3(0, 1 , 0));
    let u3 = smul(dims[2], new THREE.Vector3(0, 0 , 1));

    // 3. create all the planes of the box
    let p1 = new THREE.Vector3( - dims[0]/2., - dims[1]/2., - dims[2]/2);
    let p2 = add(p1, u2);
    let p3 = add(add(p1, u1), u2);
    let p4 = add(p1, u1);
    let p5 = add(p1, u3);
    let p6 = add(p2, u3);
    let p7 = add(p3, u3);
    let p8 = add(p4, u3);

    let plane1 = [p1, p2, p3, p4];
    let plane2 = [p1, p4, p8, p5];
    let plane3 = [p5, p6, p7, p8];
    let plane4 = [p8, p7, p3, p4];
    let plane5 = [p5, p6, p2, p1];
    let plane6 = [p6, p2, p3, p7];
    let planes = [plane1, plane2, plane3, plane4, plane5, plane6];

    // 4. calculate the distances to all the planes (reduction to segment to plane distance)
    //      we could be more clever here to only calculate to the necessary planes.
    let min_dist = 1000000;
    let p1_min;
    let p2_min;
    for (let plane of planes) {
            let res = shortestDistanceRectangleSegment_rOrtho(plane[0], plane[1], plane[2], plane[3], s1, s2);
            if (res[2] < min_dist) {
                min_dist = res[2];
                p1_min = res[0];
                p2_min = res[1];
            }
    }

    // 5. translate point back to world
    p1_min = localToWorld(p, R, p1_min);
    p2_min = localToWorld(p, R, p2_min);

    return [p1_min, p2_min, min_dist];
}

export function shortestDistanceRectangleSegment(p0, p1, p2, s1, s2) {
    // project segment to rectangle
    let s1_proj = pointToRectangle(p0, p1, p2, s1);
    let s2_proj = pointToRectangle(p0, p1, p2, s2);

    // shortest distance between this segment & rectngle
    let res = segSegShortestDist(s1, s2, s1_proj, s2_proj);
    let min_dist = sub(res[0], res[1]).length();
    let min_p1 = res[0];
    let min_p2 = res[1];

    let R = getRectanglePoints(p0, p1, p2);
    let r1 = R[0], r2 = R[1], r3 = R[2], r4 = R[3];

    // but now check all the other segments as well
    res = segSegShortestDist(s1, s2, r1, r2);
    let dist = sub(res[0], res[1]);
    if (dist < min_dist) {
        min_dist = dist;
        min_p1 = res[0];
        min_p2 = res[1];
    }

    res = segSegShortestDist(s1, s2, r2, r3);
    dist = sub(res[0], res[1]);
    if (dist < min_dist) {
        min_dist = dist;
        min_p1 = res[0];
        min_p2 = res[1];
    }

    res = segSegShortestDist(s1, s2, r3, r4);
    dist = sub(res[0], res[1]);
    if (dist < min_dist) {
        min_dist = dist;
        min_p1 = res[0];
        min_p2 = res[1];
    }

    res = segSegShortestDist(s1, s2, r4, r1);
    dist = sub(res[0], res[1]);
    if (dist < min_dist) {
        min_dist = dist;
        min_p1 = res[0];
        min_p2 = res[1];
    }

    return [min_p1, min_p2, min_dist];
}

export function projectToSegment(p, a, b) {
    let ab = sub(b, a);
    let t = 1;
    if (dot(ab, ab) >= 1e-5) {
        t = dot(sub(p, a), ab);
        t = t / dot(ab, ab);
        t = clamp01(t);
    }
    return add(a, smul(t, ab));
}

export function clamp01(t) {
    if (t > 1)
        return 1
    if (t < 0)
        return 0;
    return t;
}

export function projectToPlane(nPlane_, pPlane, p) {
    let nPlane = nPlane_.clone();
    nPlane.normalize();
    let v = sub(p, pPlane);
    let dist = dot(v, nPlane);
    return sub(p, smul(dist, nPlane));
}
