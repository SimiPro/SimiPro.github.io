
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
    let u1 = u1_.clone();
    let u2 = u2_.clone();
    u1.normalize();
    u2.normalize();

    let axis = u1.clone();
    axis.cross(u2);
    axis.normalize();

    console.log("u1:", u1, " u2: ", u2, " axis:", axis);
    console.log("u1.axis: ", u1.dot(axis), " u2.axis: ", u2.dot(axis));
    let angleRad = Math.acos(u1.dot(u2));
    return [axis, angleRad]
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
    let u2 = sub(r2, r0);

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

    let u1 = sub(p1, p0);
    let u2_ = sub(p2, p0);

    let ext1 = u1.length();
    let ext2 = u2_.length();

    u1.normalize();
    u2_.normalize();

    let nNormal = cross(u1, u2_);
    let u2 = cross(u1, nNormal);


    // check if we have to turn u2 because it could point into the wrong direction
    if (sub(add(p, u2), p2).length() > sub(add(p, u2.clone().negate()), p2).length()) {
        u2.negate();
    }

    let diff = sub(q, p);
    let s = clamp(u1.dot(diff), 0, ext1);
    let t = clamp(u2.dot(diff), 0, ext2);


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

export function shortestDistanceRectangleSegment(p0, p1, p2, s1, s2) {

    let s1_proj = pointToRectangle(p0, p1, p2, s1);
    let s2_proj = pointToRectangle(p0, p1, p2, s2);


    let res = segSegShortestDist(s1, s2, s1_proj, s2_proj);
    let min_dist = sub(res[0], res[1]).length();
    let min_p1 = res[0];
    let min_p2 = res[1];

    let R = getRectanglePoints(p0, p1, p2);
    let r1 = R[0], r2 = R[1], r3 = R[2], r4 = R[3];

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
