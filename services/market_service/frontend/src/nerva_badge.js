import BadgeImage from './nerva-coin-logo.png';

const NervaBadge = ({price_xnv}) => {
    return (
        <span className='xnv-span'>
            <img src={BadgeImage} alt='nerva-coin-logo' className='xmr-img' /> {price_xnv} XNV
        </span>
    );
};

export default NervaBadge;