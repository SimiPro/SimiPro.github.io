
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

}

export function rotateAlignNaive(u1_, u2_) {
    let u1 = u1_.clone();
    let u2 = u2_.clone();
    u1.normalize();
    u2.normalize();

    let axis = u1;
    axis.cross(u2);
    axis.normalize();

    let angleRad = Math.acos(u1.dot(u2));

}

Eigen::Matrix3d KS_MechanicalComponent::rotateAlignNaive(const V3D &u1, const V3D &u2)
{
    double angleRad = std::acos(u1.normalized().dot(u2.normalized()));
    Eigen::AngleAxisd R(angleRad, axis);
    return R.matrix();
}
