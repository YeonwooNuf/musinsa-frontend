import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import * as PortOne from "@portone/browser-sdk/v2";

const Payment = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { cartItems, finalPrice, usedPoints } = location.state || {
        cartItems: [],
        finalPrice: 0,
        usedPoints: 0
    };

    useEffect(() => {
        console.log("🚀 Payment 페이지 state 값:", location.state);
    }, []);

    const getAuthHeaders = () => {
        const token = localStorage.getItem("token"); // ✅ JWT 토큰 가져오기

        if (!token) {
            console.warn("🚨 인증 토큰 없음! 로그인 페이지로 이동");
            alert("로그인이 필요합니다.");
            window.location.href = "/login"; // 로그인 페이지로 이동
            return {};
        }

        return { Authorization: `Bearer ${token}` };
    };

    // merchantData 에서 한글 제거
    const encodeToBase64 = (data) => {
        return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
    };

    const decodeFromBase64 = (encodedData) => {
        return JSON.parse(decodeURIComponent(escape(atob(encodedData))));
    };

    const [paymentMethod, setPaymentMethod] = useState("CARD"); // 기본 결제 수단은 카드

    useEffect(() => {
        if (!cartItems.length) {
            alert("결제할 상품이 없습니다.");
            navigate("/checkout");
        }
    }, [cartItems, navigate]);

    function randomId() {
        return [...crypto.getRandomValues(new Uint32Array(2))]
            .map(word => word.toString(16).padStart(8, "0"))
            .join("");
    }

    const handlePayment = async () => {
        const paymentId = randomId();

        const customDataEncoded = encodeToBase64({
            cartItems: cartItems.map(item => ({
                id: item.id,
                name: item.productName, // ✅ 한글 포함
                color: item.color, // ✅ 한글 포함 가능
                size: item.size,
                price: item.price
            })),
            usedCoupons 
        });


        const payment = await PortOne.requestPayment({
            storeId: "store-648c3fc7-1da1-467a-87bb-3b235f5c9879",
            channelKey: "channel-key-f3019356-750d-42dd-b2ba-9c857896bd38",
            paymentId,
            orderName: `FitHub 상품 결제`,
            totalAmount: finalPrice, // ✅ 사용한 포인트를 반영한 최종 결제 금액
            currency: "KRW",
            customer: {
                fullName: "asd1234",
                phoneNumber: "010-0000-1234",
                email: "test@portone.io",
            },
            payMethod: paymentMethod.toUpperCase(), // 선택한 결제 수단 사용
            customData: customDataEncoded
        });

        if (payment.code !== undefined) {
            alert(`결제 실패: ${payment.message}`);
            return;
        }

        // ✅ JWT 인증 헤더 추가
        const headers = getAuthHeaders();
        if (!headers.Authorization) {
            return;
        }

        // ✅ JWT 인증 헤더 추가하여 요청 전송
        const completeResponse = await fetch("/api/payment/complete", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...headers // ✅ JWT 인증 토큰 포함
            },
            body: JSON.stringify({ paymentId, usedPoints })
        });

        if (completeResponse.ok) {
            alert("결제가 성공적으로 완료되었습니다.");
            const paymentDate = new Date().toISOString(); // ✅ 현재 시간

        navigate("/order/complete", {   // ✅ 결제 완료 페이지 이동
            state: {
                paymentId,
                usedPoints,
                usedCoupons,
                totalAmount: cartItems.reduce((sum, item) => sum + item.price, 0),
                finalAmount: finalPrice,
                cartItems,
                paymentDate
            }
        });
        } else {
            alert("결제 검증 실패");
        }
    };

    return (
        <div className="payment">
            <h2>결제하기</h2>
            <h3>총 결제 금액: {finalPrice.toLocaleString()}원</h3>

            <label>결제 수단 선택:</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                <option value="card">카드 결제</option>
                <option value="naverpay">네이버페이</option>
                <option value="kakaopay">카카오페이</option>
            </select>

            <button onClick={handlePayment}>결제 진행</button>
        </div>
    );
};

export default Payment;
