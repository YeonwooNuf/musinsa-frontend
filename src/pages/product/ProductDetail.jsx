import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./ProductDetail.css";

const ProductDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedSize, setSelectedSize] = useState("");
    const [selectedColor, setSelectedColor] = useState("");
    const [message, setMessage] = useState(null); // ✅ 알림 메시지 추가
    const sliderRef = React.useRef(null);

    const parseJSON = (data) => {
        try {
            let parsedData = JSON.parse(data);
            if (typeof parsedData === "string") {
                parsedData = JSON.parse(parsedData);
            }
            return Array.isArray(parsedData) ? parsedData : [];
        } catch (error) {
            console.error("❌ JSON 파싱 오류:", error);
            return [];
        }
    };

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const token = localStorage.getItem("token");
                const headers = token ? { Authorization: `Bearer ${token}` } : {};

                const response = await axios.get(`/api/products/${id}`, { headers });
                console.log("✅ 상품 상세 API 응답:", response.data);
                setProduct(response.data);

                const sizes = parseJSON(response.data.sizes);
                const colors = parseJSON(response.data.colors);

                if (sizes.length > 0) setSelectedSize(sizes[0]);
                if (colors.length > 0) setSelectedColor(colors[0]);
            } catch (error) {
                console.error("❌ 상품 정보를 불러오는 중 오류 발생:", error);
                setError("상품 정보를 불러오는 데 실패했습니다.");
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [id]);

    if (loading) return <p className="loading">로딩 중...</p>;
    if (error) return <p className="error">{error}</p>;
    if (!product) return <p className="error">상품 정보를 찾을 수 없습니다.</p>;

    const parsedSizes = parseJSON(product.sizes);
    const parsedColors = parseJSON(product.colors);

    // ✅ 장바구니 담기 기능 추가
    const handleAddToCart = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("로그인이 필요합니다.");
                navigate("/login");
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };

            const requestData = {
                productId: product.id,
                size: selectedSize,
                color: selectedColor,
                quantity: 1, // 기본 수량 1개
            };

            const response = await axios.post("/api/cart/add", requestData, { headers });
            console.log("✅ 장바구니 추가 성공:", response.data);

            setMessage("장바구니에 추가되었습니다!");
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error("❌ 장바구니 추가 중 오류 발생:", error);
            setMessage("장바구니 추가에 실패했습니다.");
            setTimeout(() => setMessage(null), 3000);
        }
    };

    // ✅ 구매하기 버튼 클릭 시 결제 페이지로 이동
    const handlePurchase = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                alert("로그인이 필요합니다.");
                navigate("/login");
                return;
            }

            const headers = { Authorization: `Bearer ${token}` };

            // ✅ 사용 가능한 포인트 가져오기
            const pointsResponse = await axios.get("/api/points", { headers });
            const availablePoints = pointsResponse.data.amount || 0;

            // ✅ 사용 가능한 쿠폰 목록 가져오기 (전체 쿠폰)
            const couponsResponse = await axios.get("/api/coupons", { headers });
            const allCoupons = couponsResponse.data.coupons || [];

            // ✅ 초기에는 선택된 쿠폰 없음
            const appliedCoupons = {};

            // ✅ 단일 상품을 cartItems 형식으로 변환하여 Checkout으로 전달
            const cartItems = [
                {
                    id: product.id,
                    productName: product.name,
                    price: product.price,
                    productImage: product.images[0], // 첫 번째 이미지 사용
                    size: selectedSize,
                    color: selectedColor,
                    quantity: 1, // 단일 상품이므로 수량 1
                    category: product.category,
                    brandName: product.brandName,
                },
            ];

            // ✅ Checkout 페이지로 이동 (Cart와 동일한 방식)
            navigate("/checkout", {
                state: {
                    cartItems,
                    availablePoints,
                    availableCoupons: allCoupons, // ✅ 필터링하지 않고 전체 쿠폰 전달
                    appliedCoupons, // ✅ 초기에는 선택된 쿠폰 없음
                    totalPrice: product.price, // 단일 상품 가격
                },
            });
        } catch (error) {
            console.error("❌ Checkout 데이터 가져오기 오류:", error);
            alert("결제 페이지로 이동 중 오류가 발생했습니다.");
        }
    };

    return (
        <div className="product-detail">
            {message && <div className="alert-message">{message}</div>} {/* ✅ 알림 메시지 추가 */}

            <div className="product-image-container">
                <Slider
                    ref={sliderRef}
                    dots={true}
                    infinite={false}
                    speed={500}
                    slidesToShow={1}
                    slidesToScroll={1}
                    autoplay={true}
                    autoplaySpeed={2000}
                    pauseOnHover={true}
                    swipe={true}
                    className="product-slider"
                    beforeChange={(current, next) => {
                        const lastIndex = product.images.length - 1;
                        if (next === lastIndex) {
                            // 마지막 이미지 도달 후 잠시 후 다시 처음으로 이동
                            setTimeout(() => {
                                sliderRef.current?.slickGoTo(0);
                            }, 2500); // autoplaySpeed보다 약간 더 크게
                        }
                    }}
                >
                    {product.images?.map((image, index) => (
                        <div key={index} className="slider-image-container">
                            <img
                                src={image}
                                alt={`${product.name} ${index + 1}`}
                                className="slider-image"
                            />
                        </div>
                    ))}
                </Slider>
            </div>

            <div className="product-info">
                {/* ✅ 브랜드 정보 추가 */}
                {product.brandLogoUrl && product.brandName && (
                    <div className="brand-info">
                        <img src={product.brandLogoUrl} alt={product.brandName} className="detail-brand-logo" />
                        <span className="detail-brand-name">{product.brandName}</span>
                        {product.brandSubName && <span className="brand-sub-name">({product.brandSubName})</span>}
                    </div>
                )}
                <h1 className="detail-product-name">{product.name}</h1>
                <p className="detail-product-price">{product.price?.toLocaleString()} 원</p>

                <div className="description">
                    <p>{product.description}</p>
                </div>

                {parsedSizes.length > 0 && (
                    <div className="size-selector">
                        <h4>사이즈 선택</h4>
                        <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                            {parsedSizes.map((size, index) => (
                                <option key={index} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                )}

                {parsedColors.length > 0 && (
                    <div className="color-selector">
                        <h4>색상 선택</h4>
                        <select value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
                            {parsedColors.map((color, index) => (
                                <option key={index} value={color}>{color}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="action-buttons">
                    <button className="add-to-cart" onClick={handleAddToCart}>장바구니에 담기</button>
                    <button className="payment" onClick={handlePurchase}>구매하기</button>
                </div>
            </div>
        </div>
    );
};

export default ProductDetail;
